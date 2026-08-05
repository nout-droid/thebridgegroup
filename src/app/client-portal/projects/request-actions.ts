"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgAccess } from "@/lib/server/subscription";
import { ensureIntakeChecklist } from "@/lib/server/ensure-intake-checklist";
import { ensureProjectTodos } from "@/lib/server/ensure-project-todos";
import { logAudit } from "@/lib/server/audit";

function generateEventCode(length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// Een klantaccount heeft geen Supabase Auth-sessie (alleen de client_account_id-cookie),
// dus create_project_secure (auth.uid()-gated) is hier niet bruikbaar — deze actie
// gebruikt bewust de service-role client, na handmatige verificatie van de cookie en
// can_submit_requests, net als de andere schrijfacties vanuit het klantportaal.
export async function requestClientProject(formData: FormData) {
  const cookieStore = await cookies();
  const accountId = cookieStore.get("client_account_id")?.value;
  if (!accountId) redirect("/client-portal");

  const name = String(formData.get("name") ?? "").trim();
  const eventDate = String(formData.get("event_date") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim();

  if (!name) {
    redirect(`/client-portal/projects?requestError=${encodeURIComponent("Vul een naam voor het event in.")}`);
  }

  const admin = createAdminClient();

  const { data: account } = await admin
    .from("client_accounts")
    .select("id, name, owner_user_id, can_submit_requests")
    .eq("id", accountId)
    .maybeSingle();

  if (!account) redirect("/client-portal");
  if (!account.can_submit_requests) {
    redirect(
      `/client-portal/projects?requestError=${encodeURIComponent("Je account heeft geen rechten om nieuwe projecten aan te vragen.")}`
    );
  }

  const access = await getOrgAccess(account.owner_user_id);
  if (!access.canCreateProject) {
    redirect(
      `/client-portal/projects?requestError=${encodeURIComponent("Er kunnen op dit moment geen nieuwe projecten worden aangemaakt. Neem contact op met je aanbieder.")}`
    );
  }

  const { data: project, error } = await admin
    .from("projects")
    .insert({
      user_id: account.owner_user_id,
      name,
      client_name: account.name,
      event_date: eventDate,
      event_code: generateEventCode(),
    })
    .select("id")
    .single();

  if (error || !project) {
    redirect(
      `/client-portal/projects?requestError=${encodeURIComponent("Aanvragen is niet gelukt, probeer het later opnieuw.")}`
    );
  }

  await admin.from("client_account_projects").insert({ client_account_id: account.id, project_id: project.id });

  if (description) {
    await admin.from("client_requests").insert({
      project_id: project.id,
      category: "Nieuwe aanvraag",
      description,
    });
  }

  await ensureIntakeChecklist(admin, project.id);
  await ensureProjectTodos(admin, project.id, account.owner_user_id);

  await logAudit(admin, {
    ownerId: account.owner_user_id,
    actorLabel: `Klant: ${account.name}`,
    action: "Nieuw project aangevraagd via klantportaal",
    details: name,
  });

  redirect("/client-portal/projects?requested=1");
}
