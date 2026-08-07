import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrigin } from "@/lib/server/origin";
import { ACTIVITY_CATEGORY_LABELS } from "@/lib/activity-labels";
import { renderDigestEmail, type DigestCrmData, type DigestProjectGroup } from "@/lib/server/digest-email";

// Dagen tot de volgende verjaardag, ongeacht geboortejaar — zelfde logica als src/app/crm/page.tsx.
function daysUntilNextBirthday(birthday: string, today: Date): number {
  const [, month, day] = birthday.split("-").map(Number);
  let next = new Date(today.getFullYear(), month - 1, day);
  if (next < today) next = new Date(today.getFullYear() + 1, month - 1, day);
  return Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function followUpUrgency(dateStr: string, today: Date): "overdue" | "soon" | null {
  const diffDays = Math.round((new Date(dateStr).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "overdue";
  if (diffDays <= 3) return "soon";
  return null;
}

function formatDateLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("nl-NL", { day: "numeric", month: "long" });
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const today = new Date(new Date().toDateString());

  // Twee onafhankelijke bronnen die allebei op user_id (= team owner id) gescoped zijn — activity_log
  // via de gekoppelde project, sales_leads rechtstreeks (zelfde owner-conventie, zie getTeamOwnerId).
  const [{ data: rows }, { data: leads }] = await Promise.all([
    admin
      .from("activity_log")
      .select("id, actor_label, category, description, project:projects(id, name, user_id)")
      .is("notified_at", null),
    admin
      .from("sales_leads")
      .select("user_id, company_name, contact_name, contact_birthday, next_follow_up_date")
      .or("contact_birthday.not.is.null,next_follow_up_date.not.is.null"),
  ]);

  type Row = {
    id: string;
    actor_label: string;
    category: string;
    description: string;
    project: { id: string; name: string; user_id: string } | { id: string; name: string; user_id: string }[] | null;
  };

  const byOwner = new Map<string, { rowIds: string[]; projects: Map<string, DigestProjectGroup> }>();

  for (const row of (rows ?? []) as Row[]) {
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

  const byOwnerCrm = new Map<string, DigestCrmData>();
  for (const lead of leads ?? []) {
    const birthdayDays = lead.contact_birthday ? daysUntilNextBirthday(lead.contact_birthday, today) : null;
    const urgency = lead.next_follow_up_date ? followUpUrgency(lead.next_follow_up_date, today) : null;
    if (birthdayDays == null || birthdayDays > 7) {
      if (urgency == null) continue;
    }

    let crmEntry = byOwnerCrm.get(lead.user_id);
    if (!crmEntry) {
      crmEntry = { birthdays: [], followUps: [] };
      byOwnerCrm.set(lead.user_id, crmEntry);
    }
    if (birthdayDays != null && birthdayDays <= 7) {
      crmEntry.birthdays.push({
        companyName: lead.company_name,
        contactName: lead.contact_name,
        dateLabel: formatDateLabel(lead.contact_birthday!),
      });
    }
    if (urgency != null) {
      crmEntry.followUps.push({
        companyName: lead.company_name,
        contactName: lead.contact_name,
        urgency,
        dateLabel: formatDateLabel(lead.next_follow_up_date!),
      });
    }
  }

  const ownerIds = new Set([...byOwner.keys(), ...byOwnerCrm.keys()]);
  if (ownerIds.size === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  const origin = await getOrigin();
  const notifiedRowIds: string[] = [];
  let sent = 0;

  for (const userId of ownerIds) {
    const { data: userData } = await admin.auth.admin.getUserById(userId);
    const email = userData?.user?.email;
    if (!email || !resend || !process.env.RESEND_FROM_EMAIL) continue;

    const ownerActivity = byOwner.get(userId);
    const ownerCrm = byOwnerCrm.get(userId);
    const { subject, html } = renderDigestEmail(
      origin,
      Array.from(ownerActivity?.projects.values() ?? []),
      ownerCrm
    );
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: email,
      subject,
      html,
    });
    if (error) continue;

    sent += 1;
    if (ownerActivity) notifiedRowIds.push(...ownerActivity.rowIds);
  }

  if (notifiedRowIds.length > 0) {
    await admin.from("activity_log").update({ notified_at: new Date().toISOString() }).in("id", notifiedRowIds);
  }

  return NextResponse.json({ sent, rowsMarked: notifiedRowIds.length });
}
