import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ShareView } from "./share-view";

export default async function SharePage({
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

  let clientAccountId: string | null = null;
  let canEditChecklist = true;
  let canSubmitRequests = true;

  if (!isOwner) {
    const cookieStore = await cookies();
    const unlocked = cookieStore.get(`client_token_${token}`);
    const accountCookie = cookieStore.get("client_account_id")?.value ?? null;

    if (!unlocked && accountCookie) {
      // Multi-project klantaccount (zie /client-portal): alleen toegang als dit account
      // daadwerkelijk aan dit project gekoppeld is.
      const admin = createAdminClient();
      const { data: project } = await admin
        .from("projects")
        .select("id")
        .eq("share_token", token)
        .maybeSingle();

      const { data: link } = project
        ? await admin
            .from("client_account_projects")
            .select("id, client_account:client_accounts(can_edit_checklist, can_submit_requests)")
            .eq("client_account_id", accountCookie)
            .eq("project_id", project.id)
            .maybeSingle()
        : { data: null };

      if (link) {
        clientAccountId = accountCookie;
        const account = link.client_account as unknown as
          | { can_edit_checklist: boolean; can_submit_requests: boolean }
          | null;
        canEditChecklist = account?.can_edit_checklist ?? true;
        canSubmitRequests = account?.can_submit_requests ?? true;
      }
    }

    if (!unlocked && !clientAccountId) {
      redirect("/portal");
    }
  }

  return (
    <ShareView
      token={token}
      clientAccountId={clientAccountId}
      canEditChecklist={canEditChecklist}
      canSubmitRequests={canSubmitRequests}
    />
  );
}
