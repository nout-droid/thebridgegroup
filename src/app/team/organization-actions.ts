"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicStorageUrl, uploadToStorage } from "@/lib/supabase/storage-rest";
import { logAudit } from "@/lib/server/audit";

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

export async function updateOrganizationIban(formData: FormData) {
  const iban = String(formData.get("iban") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("organizations").update({ iban: iban || null }).eq("owner_user_id", user.id);
  revalidatePath("/team");
}

const BRAND_LOGO_BUCKET = "org-logos";

function logoExt(file: File): string {
  const parts = file.name.split(".");
  return parts.length > 1 ? (parts.pop() as string).toLowerCase() : "png";
}

// Logo + accentkleur voor white-label: eigen huisstijl in de app-navigatie, portalen en
// gedownloade PDF's. Alleen de eigenaar mag dit wijzigen — zelfde scoping als
// updateOrganizationName hierboven.
export async function updateOrganizationBranding(formData: FormData) {
  const brandColor = String(formData.get("brand_color") ?? "").trim();
  const logo = formData.get("logo");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const updates: { brand_color?: string; logo_url?: string } = {};

  if (brandColor && /^#[0-9a-fA-F]{6}$/.test(brandColor)) {
    updates.brand_color = brandColor;
  }

  if (logo instanceof File && logo.size > 0) {
    const path = `${user.id}/logo-${Date.now()}.${logoExt(logo)}`;
    const ok = await uploadToStorage(supabase, BRAND_LOGO_BUCKET, path, logo);
    if (ok) updates.logo_url = publicStorageUrl(BRAND_LOGO_BUCKET, path);
  }

  if (Object.keys(updates).length) {
    await supabase.from("organizations").update(updates).eq("owner_user_id", user.id);
  }

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

  // Vóór het verwijderen van de auth-user loggen: de on-delete-cascade op
  // audit_log.owner_user_id zou deze log-regel meteen weer wissen als we na
  // deleteUser() zouden loggen.
  await logAudit(admin, {
    ownerId: user.id,
    actorLabel: user.email ?? "Onbekend",
    action: "Organisatie-account verwijderd",
    details: organization.name,
  });

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    redirect(`/team?error=${encodeURIComponent("Verwijderen mislukt: " + error.message)}`);
  }

  await supabase.auth.signOut();
  redirect("/login?message=" + encodeURIComponent("Je account en alle bijbehorende gegevens zijn verwijderd."));
}
