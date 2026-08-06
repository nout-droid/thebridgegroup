import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/server/platform-admin";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Organization, PlatformLead, PlatformLeadActivity, PlatformLeadStatus } from "@/lib/types";
import { PRICING_TIERS, tierForSeatCount } from "@/lib/pricing";
import { updatePlatformLead, addPlatformLeadActivity, deletePlatformLeadActivity } from "./actions";

const STATUSES: PlatformLeadStatus[] = [
  "new",
  "contacted",
  "demo_given",
  "negotiating",
  "won",
  "lost",
  "churned",
];

const STATUS_LABELS: Record<PlatformLeadStatus, string> = {
  new: "Nieuw",
  contacted: "Contact gelegd",
  demo_given: "Demo gegeven",
  negotiating: "In onderhandeling",
  won: "Betalend",
  lost: "Verloren",
  churned: "Opgezegd",
};

function daysAgo(dateStr: string | null): string {
  if (!dateStr) return "Nog geen contact";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Vandaag";
  if (days === 1) return "Gisteren";
  return `${days} dagen geleden`;
}

function followUpBadge(dateStr: string | null) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const followUp = new Date(dateStr);
  const diffDays = Math.round((followUp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return <Badge variant="destructive">Follow-up verlopen ({dateStr})</Badge>;
  }
  if (diffDays <= 3) {
    return (
      <Badge variant="secondary" className="border border-amber-400 text-amber-700">
        Follow-up binnenkort ({dateStr})
      </Badge>
    );
  }
  return <Badge variant="outline">Follow-up: {dateStr}</Badge>;
}

function euro(value: number) {
  return `€ ${value.toFixed(0)}`;
}

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isPlatformAdmin(user.email)) redirect("/projects");

  const admin = createAdminClient();

  const [{ data: organizations }, { data: platformLeads }] = await Promise.all([
    admin.from("organizations").select("*").order("created_at", { ascending: false }).returns<Organization[]>(),
    admin
      .from("platform_leads")
      .select("*")
      .order("updated_at", { ascending: false })
      .returns<PlatformLead[]>(),
  ]);

  const orgs = organizations ?? [];
  const leadRows = platformLeads ?? [];
  const orgIds = orgs.map((o) => o.id);

  const [{ data: allActivities }, teamCounts, ownerEmails] = await Promise.all([
    leadRows.length
      ? admin
          .from("platform_lead_activities")
          .select("*")
          .in(
            "platform_lead_id",
            leadRows.map((l) => l.id)
          )
          .order("created_at", { ascending: false })
          .returns<PlatformLeadActivity[]>()
      : Promise.resolve({ data: [] as PlatformLeadActivity[] }),
    orgIds.length
      ? admin
          .from("team_members")
          .select("owner_user_id")
          .in(
            "owner_user_id",
            orgs.map((o) => o.owner_user_id)
          )
          .returns<{ owner_user_id: string }[]>()
      : Promise.resolve({ data: [] as { owner_user_id: string }[] }),
    Promise.all(
      orgs.map(async (o) => {
        const { data } = await admin.auth.admin.getUserById(o.owner_user_id);
        return [o.owner_user_id, data.user?.email ?? "-"] as const;
      })
    ),
  ]);

  const teamCountByOwner = new Map<string, number>();
  for (const row of teamCounts.data ?? []) {
    teamCountByOwner.set(row.owner_user_id, (teamCountByOwner.get(row.owner_user_id) ?? 0) + 1);
  }
  const emailByOwner = new Map(ownerEmails);

  const activitiesByLead = new Map<string, PlatformLeadActivity[]>();
  for (const activity of allActivities ?? []) {
    const list = activitiesByLead.get(activity.platform_lead_id) ?? [];
    list.push(activity);
    activitiesByLead.set(activity.platform_lead_id, list);
  }

  const orgById = new Map(orgs.map((o) => [o.id, o]));

  const leads: PlatformLead[] = leadRows
    .map((lead): PlatformLead | null => {
      const org = orgById.get(lead.organization_id);
      if (!org) return null;
      const seats = 1 + (teamCountByOwner.get(org.owner_user_id) ?? 0);
      return {
        ...lead,
        organization_name: org.name,
        owner_email: emailByOwner.get(org.owner_user_id) ?? "-",
        plan: org.plan,
        subscription_status: org.subscription_status,
        trial_ends_at: org.trial_ends_at,
        early_adopter: org.early_adopter,
        seats,
        org_created_at: org.created_at,
        activities: activitiesByLead.get(lead.id) ?? [],
      };
    })
    .filter((l): l is PlatformLead => l !== null);

  const leadsByStatus = new Map<PlatformLeadStatus, PlatformLead[]>();
  for (const status of STATUSES) leadsByStatus.set(status, []);
  for (const lead of leads) {
    leadsByStatus.get(lead.status)?.push(lead);
  }
  // Binnen elk stadium: urgentste follow-up eerst, geen follow-up-datum onderaan.
  for (const status of STATUSES) {
    leadsByStatus.get(status)?.sort((a, b) => {
      if (!a.next_follow_up_date && !b.next_follow_up_date) return 0;
      if (!a.next_follow_up_date) return 1;
      if (!b.next_follow_up_date) return -1;
      return a.next_follow_up_date.localeCompare(b.next_follow_up_date);
    });
  }

  const totalOrgs = orgs.length;
  const trialCount = orgs.filter((o) => o.subscription_status === "trialing").length;
  const activeCount = orgs.filter((o) => o.subscription_status === "active").length;
  const churnedCount = orgs.filter((o) => o.subscription_status === "canceled").length;

  const mrrEstimate = orgs
    .filter((o) => o.subscription_status === "active")
    .reduce((sum, o) => {
      const seats = 1 + (teamCountByOwner.get(o.owner_user_id) ?? 0);
      const tier = PRICING_TIERS[tierForSeatCount(seats)];
      if (tier.pricePerSeat === null) return sum; // enterprise = op aanvraag, niet meegeteld
      const price = tier.pricePerSeat * seats * (o.early_adopter ? 0.5 : 1);
      return sum + price;
    }, 0);

  const overdueCount = leads.filter(
    (l) =>
      l.next_follow_up_date &&
      l.status !== "won" &&
      l.status !== "lost" &&
      l.status !== "churned" &&
      new Date(l.next_follow_up_date) < new Date(new Date().toDateString())
  ).length;

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-6 py-8">
        <div>
          <h1 className="font-heading text-3xl font-extrabold uppercase tracking-tight">Backoffice</h1>
          <p className="text-sm text-muted-foreground">
            Alle aanmeldingen op The Bridge Production OS, van demo tot betalende klant — alleen zichtbaar
            voor jou.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Totaal aanmeldingen</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{totalOrgs}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">In proefperiode</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{trialCount}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Betalend</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{activeCount}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Opgezegd</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{churnedCount}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Geschatte MRR</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{euro(mrrEstimate)}</CardContent>
          </Card>
        </div>

        {overdueCount > 0 && (
          <p className="text-sm font-medium text-destructive">
            {overdueCount} lead{overdueCount === 1 ? "" : "s"} met een verlopen follow-up-datum.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {STATUSES.map((status) => {
            const statusLeads = leadsByStatus.get(status) ?? [];
            return (
              <Card key={status}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {STATUS_LABELS[status]}
                    <Badge variant="secondary">{statusLeads.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {statusLeads.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nog niemand in dit stadium.</p>
                  ) : (
                    statusLeads.map((lead) => (
                      <details key={lead.id} className="rounded-md border p-2.5">
                        <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm">
                          <span className="min-w-0 truncate font-medium">{lead.organization_name}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">{daysAgo(lead.last_contact_at)}</span>
                        </summary>

                        <div className="mt-3 space-y-4 border-t pt-3">
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <p>
                              <a href={`mailto:${lead.owner_email}`} className="text-primary underline">
                                {lead.owner_email}
                              </a>
                            </p>
                            <p>
                              Plan: {lead.plan} · {lead.seats} seat{lead.seats === 1 ? "" : "s"} ·{" "}
                              {lead.subscription_status}
                              {lead.early_adopter && " · early adopter"}
                            </p>
                            <p>Aangemeld: {new Date(lead.org_created_at).toLocaleDateString("nl-NL")}</p>
                            {lead.trial_ends_at && (
                              <p>Trial verloopt: {new Date(lead.trial_ends_at).toLocaleDateString("nl-NL")}</p>
                            )}
                          </div>

                          {followUpBadge(lead.next_follow_up_date)}

                          <form action={updatePlatformLead.bind(null, lead.id)} className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs">Stadium</Label>
                                <select
                                  name="status"
                                  defaultValue={lead.status}
                                  className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                                >
                                  {STATUSES.map((s) => (
                                    <option key={s} value={s}>
                                      {STATUS_LABELS[s]}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Volgende follow-up</Label>
                                <Input
                                  name="next_follow_up_date"
                                  type="date"
                                  defaultValue={lead.next_follow_up_date ?? ""}
                                  className="h-8 text-xs"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Notities</Label>
                              <textarea
                                name="notes"
                                defaultValue={lead.notes}
                                rows={2}
                                className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
                              />
                            </div>
                            <Button type="submit" size="sm" className="h-7 text-xs">
                              Opslaan
                            </Button>
                          </form>

                          <div className="space-y-2">
                            <p className="text-xs font-medium">Interacties</p>
                            <form
                              action={addPlatformLeadActivity.bind(null, lead.id)}
                              className="flex items-end gap-1.5"
                            >
                              <select
                                name="activity_type"
                                defaultValue="note"
                                className="h-8 rounded-md border bg-background px-1.5 text-xs"
                              >
                                <option value="call">Bellen</option>
                                <option value="email">E-mail</option>
                                <option value="meeting">Afspraak</option>
                                <option value="note">Notitie</option>
                              </select>
                              <Input
                                name="description"
                                placeholder="Omschrijving"
                                className="h-8 flex-1 text-xs"
                                required
                              />
                              <Button type="submit" size="sm" className="h-8 text-xs">
                                Toevoegen
                              </Button>
                            </form>
                            {(lead.activities ?? []).length === 0 ? (
                              <p className="text-xs text-muted-foreground">Nog geen interacties gelogd.</p>
                            ) : (
                              <ul className="space-y-1">
                                {(lead.activities ?? []).map((activity) => (
                                  <li
                                    key={activity.id}
                                    className="flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-xs"
                                  >
                                    <span>
                                      <Badge variant="outline" className="mr-1.5 text-[10px]">
                                        {activity.activity_type}
                                      </Badge>
                                      {activity.description}
                                    </span>
                                    <form action={deletePlatformLeadActivity.bind(null, activity.id)}>
                                      <Button type="submit" size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]">
                                        Verwijderen
                                      </Button>
                                    </form>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </details>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}
