import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { getSignedPortalUrl } from "@/lib/server/portal-storage";
import { getOrganizationName } from "@/lib/server/organization";
import { Footer } from "@/components/footer";
import { GuestView } from "./guest-view";

export default async function GuestPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!isSupabaseConfigured) {
    return <p className="p-6 text-sm text-muted-foreground">Deze pagina is nog niet beschikbaar.</p>;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isOwner = false;
  if (user) {
    const { data: ownedProject } = await supabase
      .from("projects")
      .select("id")
      .eq("share_token", token)
      .maybeSingle();
    isOwner = Boolean(ownedProject);
  }

  if (!isOwner) {
    const cookieStore = await cookies();
    if (!cookieStore.get(`guest_token_${token}`)) {
      redirect("/guest-portal");
    }
  }

  const admin = createAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select("id, name, event_date, user_id")
    .eq("share_token", token)
    .maybeSingle();

  if (!project) notFound();

  // Beide hangen alleen af van `project` (hierboven al opgehaald) en niet van elkaar —
  // parallel opvragen i.p.v. na elkaar.
  const [orgName, { data: documents }] = await Promise.all([
    getOrganizationName(project.user_id),
    admin
      .from("guest_documents")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false }),
  ]);

  const documentsWithUrls = await Promise.all(
    (documents ?? []).map(async (doc) => ({
      ...doc,
      url: await getSignedPortalUrl(doc.storage_path),
    }))
  );

  return (
    <>
      <GuestView
        projectName={project.name}
        eventDate={project.event_date}
        documents={documentsWithUrls}
        organizationName={orgName}
      />
      <Footer />
    </>
  );
}
