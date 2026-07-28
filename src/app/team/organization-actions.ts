"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateOrganizationName(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("organizations").update({ name }).eq("owner_user_id", user.id);
  revalidatePath("/team");
}

// Verwijdert de auth-gebruiker van de organisatie-eigenaar. Alle tabellen (projects,
// suppliers, organizations, client_accounts, team_members, en alles wat daar via
// on-delete-cascade onder hangt) verwijzen uiteindelijk naar auth.users(id) met
// "on delete cascade" — het verwijderen van deze ene gebruiker ruimt dus de volledige
// organisatie in één keer correct op, zonder dat we hier zelf 25+ tabellen hoeven te
// doorlopen.
export async function deleteOrganizationAccount(formData: FormData) {
  const confirmationName = String(formData.get("confirmation_name") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: organization } = await supabase
    .from("organizations")
    .select("owner_user_id, name")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (!organization || organization.owner_user_id !== user.id) {
    redirect(`/team?error=${encodeURIComponent("Alleen de organisatie-eigenaar kan het account verwijderen.")}`);
  }

  if (confirmationName !== organization.name) {
    redirect(
      `/team?error=${encodeURIComponent("Typ de exacte organisatienaam om verwijdering te bevestigen.")}`
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    redirect(`/team?error=${encodeURIComponent("Verwijderen mislukt: " + error.message)}`);
  }

  await supabase.auth.signOut();
  redirect("/login?message=" + encodeURIComponent("Je account en alle bijbehorende gegevens zijn verwijderd."));
}
