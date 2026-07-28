"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTeamOwnerId } from "@/lib/server/team";
import type { BudgetAccess } from "@/lib/types";

export async function createClientAccount(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const budgetAccess = (formData.get("budget_access") === "open" ? "open" : "closed") as BudgetAccess;
  const canEditChecklist = formData.get("can_edit_checklist") === "on";
  const canSubmitRequests = formData.get("can_submit_requests") === "on";
  const projectIds = formData.getAll("project_id").map(String);

  if (!name || !email || !password) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerId = await getTeamOwnerId(supabase, user.id);

  const { data: account, error } = await supabase
    .from("client_accounts")
    .insert({
      owner_user_id: ownerId,
      name,
      email,
      password_hash: "",
      budget_access: budgetAccess,
      can_edit_checklist: canEditChecklist,
      can_submit_requests: canSubmitRequests,
    })
    .select("id")
    .single();

  if (error || !account) {
    redirect(`/clients?error=${encodeURIComponent(error?.message ?? "Aanmaken mislukt.")}`);
  }

  await supabase.rpc("set_client_account_password", { p_account_id: account.id, p_password: password });

  if (projectIds.length) {
    await supabase
      .from("client_account_projects")
      .insert(projectIds.map((projectId) => ({ client_account_id: account.id, project_id: projectId })));
  }

  revalidatePath("/clients");
}

export async function updateClientAccountSettings(clientAccountId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const budgetAccess = (formData.get("budget_access") === "open" ? "open" : "closed") as BudgetAccess;
  const canEditChecklist = formData.get("can_edit_checklist") === "on";
  const canSubmitRequests = formData.get("can_submit_requests") === "on";
  const projectIds = formData.getAll("project_id").map(String);

  const supabase = await createClient();

  await supabase
    .from("client_accounts")
    .update({
      name,
      budget_access: budgetAccess,
      can_edit_checklist: canEditChecklist,
      can_submit_requests: canSubmitRequests,
    })
    .eq("id", clientAccountId);

  await supabase.from("client_account_projects").delete().eq("client_account_id", clientAccountId);
  if (projectIds.length) {
    await supabase
      .from("client_account_projects")
      .insert(projectIds.map((projectId) => ({ client_account_id: clientAccountId, project_id: projectId })));
  }

  revalidatePath("/clients");
}

export async function setClientAccountPassword(clientAccountId: string, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!password) return;

  const supabase = await createClient();
  await supabase.rpc("set_client_account_password", { p_account_id: clientAccountId, p_password: password });

  revalidatePath("/clients");
}

export async function deleteClientAccount(clientAccountId: string) {
  const supabase = await createClient();
  await supabase.from("client_accounts").delete().eq("id", clientAccountId);

  revalidatePath("/clients");
}
