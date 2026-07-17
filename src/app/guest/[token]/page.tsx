import Image from "next/image";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { getSignedPortalUrl } from "@/lib/server/portal-storage";

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
      .eq("user_id", user.id)
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
    .select("id, name, event_date")
    .eq("share_token", token)
    .maybeSingle();

  if (!project) notFound();

  const { data: documents } = await admin
    .from("guest_documents")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  const documentsWithUrls = await Promise.all(
    (documents ?? []).map(async (doc) => ({
      ...doc,
      url: await getSignedPortalUrl(doc.storage_path),
    }))
  );

  return (
    <div>
      <header className="flex items-center gap-2 bg-black px-6 py-3 text-sm font-semibold uppercase tracking-wide text-primary">
        <Image src="/logo.png" alt="The Bridge AV Group" width={28} height={21} />
        The Bridge AV Group
      </header>
      <div className="mx-auto w-full max-w-2xl space-y-6 px-6 py-8">
        <div>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          {project.event_date && <p className="text-muted-foreground">{project.event_date}</p>}
        </div>

        {!documentsWithUrls.length ? (
          <p className="text-sm text-muted-foreground">Er zijn nog geen documenten geplaatst.</p>
        ) : (
          <ul className="space-y-2">
            {documentsWithUrls.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between rounded-md border p-3">
                <span>{doc.title}</span>
                {doc.url && (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline"
                  >
                    Downloaden
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
