import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getOrganizationName } from "@/lib/server/organization";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/footer";
import { AttendeeLogin } from "@/app/attendee/[token]/attendee-login";
import { registerAttendee, loginAttendee } from "@/app/attendee/[token]/actions";

interface AttendeeConnectTarget {
  id: string;
  project_id: string;
  name: string;
  company: string | null;
  title: string | null;
  networking_opt_in: boolean;
  projects: {
    share_token: string;
    name: string;
    user_id: string;
    attendee_app_enabled: boolean;
  };
}

function Shell({ orgName, children }: { orgName: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black p-6 text-center text-white">
      <Image src="/logo.png" alt={orgName} width={56} height={42} />
      {children}
      <Footer variant="dark" />
    </div>
  );
}

// Scannen van iemands QR-code = expliciete, fysieke intentie om te verbinden — dus verbinden
// gebeurt automatisch zodra de bezoeker (na eventueel inloggen/registreren voor dit event)
// hier landt, zonder extra bevestigingsklik. Hergebruikt save_attendee_contact (ON CONFLICT DO
// NOTHING), dus veilig om deze pagina meerdere keren te bezoeken/verversen.
export default async function AttendeeConnectPage({
  params,
}: {
  params: Promise<{ qrToken: string }>;
}) {
  const { qrToken } = await params;

  if (!isSupabaseConfigured) {
    return <p className="p-6 text-sm text-muted-foreground">Deze pagina is nog niet beschikbaar.</p>;
  }

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("event_attendees")
    .select("id, project_id, name, company, title, networking_opt_in, projects!inner(share_token, name, user_id, attendee_app_enabled)")
    .eq("qr_token", qrToken)
    .maybeSingle<AttendeeConnectTarget>();

  if (!target || !target.projects.attendee_app_enabled) {
    return (
      <Shell orgName="The Bridge Group B.V.">
        <p className="text-lg font-semibold">Deze QR-code is niet (meer) geldig.</p>
      </Shell>
    );
  }

  const projectToken = target.projects.share_token;
  const orgName = await getOrganizationName(target.projects.user_id);

  const cookieStore = await cookies();
  const viewerId = cookieStore.get(`attendee_id_${projectToken}`)?.value;

  let verifiedViewerId: string | null = null;
  if (viewerId) {
    const { data: viewer } = await admin
      .from("event_attendees")
      .select("id")
      .eq("id", viewerId)
      .eq("project_id", target.project_id)
      .maybeSingle();
    verifiedViewerId = viewer?.id ?? null;
  }

  if (!verifiedViewerId) {
    return (
      <AttendeeLogin
        token={projectToken}
        organizationName={orgName}
        projectName={target.projects.name}
        registerAction={registerAttendee.bind(null, projectToken)}
        loginAction={loginAttendee.bind(null, projectToken)}
      />
    );
  }

  if (verifiedViewerId === target.id) {
    return (
      <Shell orgName={orgName}>
        <p className="text-lg font-semibold">Dit is je eigen QR-code.</p>
        <Link href={`/attendee/${projectToken}`}>
          <Button className="mt-2">Naar de event app</Button>
        </Link>
      </Shell>
    );
  }

  if (!target.networking_opt_in) {
    return (
      <Shell orgName={orgName}>
        <p className="text-lg font-semibold">{target.name} is momenteel niet zichtbaar in het netwerk.</p>
        <Link href={`/attendee/${projectToken}`}>
          <Button className="mt-2">Naar de event app</Button>
        </Link>
      </Shell>
    );
  }

  const supabase = await createClient();
  await supabase.rpc("save_attendee_contact", {
    p_attendee_id: verifiedViewerId,
    p_saved_attendee_id: target.id,
  });

  return (
    <Shell orgName={orgName}>
      <p className="text-lg font-semibold text-[#7dff43]">Verbonden met {target.name}!</p>
      {(target.title || target.company) && (
        <p className="text-sm text-white/60">{[target.title, target.company].filter(Boolean).join(" · ")}</p>
      )}
      <Link href={`/attendee/${projectToken}`}>
        <Button className="mt-2">Bekijk in Opgeslagen</Button>
      </Link>
    </Shell>
  );
}
