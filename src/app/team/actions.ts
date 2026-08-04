"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrigin } from "@/lib/server/origin";
import { getTeamOwnerId } from "@/lib/server/team";
import { syncSubscriptionSeats } from "@/lib/server/subscription";
import { logAudit } from "@/lib/server/audit";
import type { TeamRole } from "@/lib/types";

async function isTeamAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  userId: string
) {
  if (ownerId === userId) return true;
  const { data } = await supabase
    .from("team_members")
    .select("role")
    .eq("owner_user_id", ownerId)
    .eq("member_user_id", userId)
    .maybeSingle();
  return data?.role === "admin";
}

export async function inviteTeamMember(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = (formData.get("role") === "admin" ? "admin" : "member") as TeamRole;
  const canViewBudget = formData.get("can_view_budget") === "on";
  const projectIds = formData.getAll("project_id").map(String);
  if (!email) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerId = await getTeamOwnerId(supabase, user.id);
  if (!(await isTeamAdmin(supabase, ownerId, user.id))) {
    redirect(`/team?error=${encodeURIComponent("Alleen beheerders mogen teamleden uitnodigen.")}`);
  }

  const origin = await getOrigin();
  const admin = createAdminClient();
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/auth/reset-password`,
  });

  if (inviteError || !inviteData?.user) {
    redirect(
      `/team?error=${encodeURIComponent(inviteError?.message ?? "Uitnodigen is niet gelukt.")}`
    );
  }

  const { data: teamMember, error: insertError } = await supabase
    .from("team_members")
    .insert({
      owner_user_id: ownerId,
      member_user_id: inviteData.user.id,
      role,
      invited_email: email,
      can_view_budget: canViewBudget,
    })
    .select("id")
    .single();

  if (insertError || !teamMember) {
    redirect(`/team?error=${encodeURIComponent(insertError?.message ?? "Onbekende fout")}`);
  }

  if (projectIds.length) {
    await supabase.from("team_member_project_access").insert(
      projectIds.map((projectId) => ({ team_member_id: teamMember.id, project_id: projectId }))
    );
  }

  await syncSubscriptionSeats(ownerId);
  await logAudit(admin, {
    ownerId,
    actorLabel: user.email ?? "Onbekend",
    action: "Teamlid uitgenodigd",
    details: email,
  });
  revalidatePath("/team");
}

export async function updateTeamMemberRole(teamMemberId: string, formData: FormData) {
  const role = (formData.get("role") === "admin" ? "admin" : "member") as TeamRole;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: member } = await supabase
    .from("team_members")
    .select("owner_user_id, invited_email")
    .eq("id", teamMemberId)
    .maybeSingle();

  await supabase.from("team_members").update({ role }).eq("id", teamMemberId);

  if (user && member?.owner_user_id) {
    const admin = createAdminClient();
    await logAudit(admin, {
      ownerId: member.owner_user_id,
      actorLabel: user.email ?? "Onbekend",
      action: "Rol gewijzigd",
      details: member.invited_email ? `${member.invited_email} → ${role}` : role,
    });
  }

  revalidatePath("/team");
}

export async function updateTeamMemberAccess(teamMemberId: string, formData: FormData) {
  const canViewBudget = formData.get("can_view_budget") === "on";
  const roleId = String(formData.get("role_id") ?? "") || null;
  const projectIds = formData.getAll("project_id").map(String);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: member } = await supabase
    .from("team_members")
    .select("owner_user_id, invited_email")
    .eq("id", teamMemberId)
    .maybeSingle();

  await supabase
    .from("team_members")
    .update({ can_view_budget: canViewBudget, role_id: roleId })
    .eq("id", teamMemberId);

  await supabase.from("team_member_project_access").delete().eq("team_member_id", teamMemberId);
  if (projectIds.length) {
    await supabase.from("team_member_project_access").insert(
      projectIds.map((projectId) => ({ team_member_id: teamMemberId, project_id: projectId }))
    );
  }

  if (user && member?.owner_user_id) {
    const admin = createAdminClient();
    await logAudit(admin, {
      ownerId: member.owner_user_id,
      actorLabel: user.email ?? "Onbekend",
      action: "Toegang aangepast",
      details: member.invited_email ?? "",
    });
  }

  revalidatePath("/team");
}

export async function removeTeamMember(teamMemberId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: member } = await supabase
    .from("team_members")
    .select("owner_user_id, invited_email")
    .eq("id", teamMemberId)
    .maybeSingle();

  await supabase.from("team_members").delete().eq("id", teamMemberId);

  if (member?.owner_user_id) await syncSubscriptionSeats(member.owner_user_id);

  if (user && member?.owner_user_id) {
    const admin = createAdminClient();
    await logAudit(admin, {
      ownerId: member.owner_user_id,
      actorLabel: user.email ?? "Onbekend",
      action: "Teamlid verwijderd",
      details: member.invited_email ?? "",
    });
  }

  revalidatePath("/team");
}

function parseRoleFields(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    all_projects: formData.get("all_projects") === "on",
    can_view_budget: formData.get("can_view_budget") === "on",
    can_edit: formData.get("can_edit") === "on",
    nav_sections: formData.getAll("nav_sections").map(String),
  };
}

export async function createTeamRole(formData: FormData) {
  const fields = parseRoleFields(formData);
  if (!fields.name) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const ownerId = await getTeamOwnerId(supabase, user.id);

  const { count } = await supabase
    .from("team_roles")
    .select("id", { count: "exact", head: true })
    .eq("owner_user_id", ownerId);

  await supabase.from("team_roles").insert({ owner_user_id: ownerId, ...fields, sort_order: count ?? 0 });
  revalidatePath("/team");
}

export async function updateTeamRole(roleId: string, formData: FormData) {
  const fields = parseRoleFields(formData);
  if (!fields.name) return;

  const supabase = await createClient();
  await supabase.from("team_roles").update(fields).eq("id", roleId);
  revalidatePath("/team");
}

export async function deleteTeamRole(roleId: string) {
  const supabase = await createClient();
  await supabase.from("team_roles").delete().eq("id", roleId);
  revalidatePath("/team");
}
