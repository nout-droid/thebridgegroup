"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getTeamOwnerId } from "@/lib/server/team";
import { countUnreadNotifications } from "@/lib/server/notifications";

export interface NotificationRow {
  id: string;
  projectId: string;
  projectName: string;
  actorLabel: string;
  category: string;
  description: string;
  createdAt: string;
}

type ActivityRow = {
  id: string;
  actor_label: string;
  category: string;
  description: string;
  created_at: string;
  project: { id: string; name: string; user_id: string } | { id: string; name: string; user_id: string }[] | null;
};

export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const ownerId = await getTeamOwnerId(supabase, user.id);
  return countUnreadNotifications(supabase, ownerId);
}

export async function getNotifications(): Promise<NotificationRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const ownerId = await getTeamOwnerId(supabase, user.id);
  const { data } = await supabase
    .from("activity_log")
    .select("id, actor_label, category, description, created_at, project:projects!inner(id, name, user_id)")
    .is("acknowledged_at", null)
    .eq("project.user_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<ActivityRow[]>();

  return (data ?? []).flatMap((row) => {
    const project = Array.isArray(row.project) ? row.project[0] : row.project;
    if (!project) return [];
    return [
      {
        id: row.id,
        projectId: project.id,
        projectName: project.name,
        actorLabel: row.actor_label,
        category: row.category,
        description: row.description,
        createdAt: row.created_at,
      },
    ];
  });
}

export async function acknowledgeNotification(id: string) {
  const supabase = await createClient();
  await supabase.from("activity_log").update({ acknowledged_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function acknowledgeAllNotifications() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const ownerId = await getTeamOwnerId(supabase, user.id);
  const { data: rows } = await supabase
    .from("activity_log")
    .select("id, project:projects!inner(user_id)")
    .is("acknowledged_at", null)
    .eq("project.user_id", ownerId);

  const ids = (rows ?? []).map((r) => r.id);
  if (ids.length > 0) {
    await supabase.from("activity_log").update({ acknowledged_at: new Date().toISOString() }).in("id", ids);
  }
  revalidatePath("/", "layout");
}
