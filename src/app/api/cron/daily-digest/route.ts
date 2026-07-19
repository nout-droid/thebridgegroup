import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrigin } from "@/lib/server/origin";
import { ACTIVITY_CATEGORY_LABELS } from "@/lib/activity-labels";
import { renderDigestEmail, type DigestProjectGroup } from "@/lib/server/digest-email";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();

  const { data: rows } = await admin
    .from("activity_log")
    .select("id, actor_label, category, description, project:projects(id, name, user_id)")
    .is("notified_at", null);

  if (!rows || rows.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  type Row = {
    id: string;
    actor_label: string;
    category: string;
    description: string;
    project: { id: string; name: string; user_id: string } | { id: string; name: string; user_id: string }[] | null;
  };

  const byOwner = new Map<string, { rowIds: string[]; projects: Map<string, DigestProjectGroup> }>();

  for (const row of rows as Row[]) {
    const project = Array.isArray(row.project) ? row.project[0] : row.project;
    if (!project) continue;

    let ownerEntry = byOwner.get(project.user_id);
    if (!ownerEntry) {
      ownerEntry = { rowIds: [], projects: new Map() };
      byOwner.set(project.user_id, ownerEntry);
    }
    ownerEntry.rowIds.push(row.id);

    let projectGroup = ownerEntry.projects.get(project.id);
    if (!projectGroup) {
      projectGroup = { projectId: project.id, projectName: project.name, entries: [] };
      ownerEntry.projects.set(project.id, projectGroup);
    }
    projectGroup.entries.push({
      actorLabel: row.actor_label,
      categoryLabel: ACTIVITY_CATEGORY_LABELS[row.category] ?? row.category,
      description: row.description,
    });
  }

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  const origin = await getOrigin();
  const notifiedRowIds: string[] = [];
  let sent = 0;

  for (const [userId, { rowIds, projects }] of byOwner) {
    const { data: userData } = await admin.auth.admin.getUserById(userId);
    const email = userData?.user?.email;
    if (!email || !resend || !process.env.RESEND_FROM_EMAIL) continue;

    const { subject, html } = renderDigestEmail(origin, Array.from(projects.values()));
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: email,
      subject,
      html,
    });
    if (error) continue;

    sent += 1;
    notifiedRowIds.push(...rowIds);
  }

  if (notifiedRowIds.length > 0) {
    await admin.from("activity_log").update({ notified_at: new Date().toISOString() }).in("id", notifiedRowIds);
  }

  return NextResponse.json({ sent, rowsMarked: notifiedRowIds.length });
}
