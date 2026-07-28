import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamOwnerId } from "@/lib/server/team";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Organization, TeamMember } from "@/lib/types";
import { TEAM_ROLE_LABELS } from "@/lib/types";
import { TeamRoleSelect } from "./role-select";
import {
  inviteTeamMember,
  updateTeamMemberRole,
  updateTeamMemberAccess,
  removeTeamMember,
} from "./actions";
import { updateOrganizationName, deleteOrganizationAccount } from "./organization-actions";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

const TEAM_PAGE_LABELS = [
  "Team",
  "Bedankt! Je abonnement wordt geactiveerd zodra Stripe de betaling bevestigt.",
  "Organisatie & abonnement",
  "Plan:",
  "Status:",
  "Proefperiode tot",
  "Upgraden",
  "Abonnement beheren",
  "Organisatienaam",
  "Opslaan",
  "Teamlid uitnodigen",
  "E-mail",
  "Rol",
  "Uitnodigen",
  "Toegang tot projecten",
  "Nog geen projecten aangemaakt.",
  "Mag Begroting zien op zijn/haar projecten",
  "Teamleden",
  "Sinds",
  "Eigenaar",
  "Verwijderen",
  "Toegang beheren voor",
  "Toegang opslaan",
  "Nog geen teamleden uitgenodigd.",
  "Gegevens & account",
  "Exporteer je gegevens",
  "Download al je projecten, begrotingen, draaiboeken en teamgegevens als JSON-bestand.",
  "Download export",
  "Account verwijderen",
  "Dit verwijdert direct en onomkeerbaar je hele organisatie: alle projecten, begrotingen, teamleden en klantaccounts. Typ de organisatienaam (",
  ") ter bevestiging.",
  "Organisatienaam ter bevestiging",
  "Verwijder account definitief",
  ...Object.values(TEAM_ROLE_LABELS),
];

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; checkout?: string }>;
}) {
  const { error, checkout } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const ownerId = await getTeamOwnerId(supabase, user.id);
  const isOwner = ownerId === user.id;
  const admin = createAdminClient();

  // Deze queries hebben alleen `ownerId` nodig (geen onderlinge afhankelijkheid) — in
  // één keer parallel opvragen i.p.v. na elkaar, anders wacht de pagina op 5 losse
  // round-trips na elkaar.
  const [
    { data: members },
    { data: ownerAuthUser },
    { data: organization },
    { data: projects },
    lang,
  ] = await Promise.all([
    supabase
      .from("team_members")
      .select("*")
      .eq("owner_user_id", ownerId)
      .order("created_at", { ascending: true })
      .returns<TeamMember[]>(),
    admin.auth.admin.getUserById(ownerId),
    admin
      .from("organizations")
      .select("*")
      .eq("owner_user_id", ownerId)
      .maybeSingle<Organization>(),
    admin
      .from("projects")
      .select("id, name")
      .eq("user_id", ownerId)
      .order("name", { ascending: true })
      .returns<{ id: string; name: string }[]>(),
    getAppLang(),
  ]);

  const viewerMembership = members?.find((m) => m.member_user_id === user.id);
  const isAdmin = isOwner || viewerMembership?.role === "admin";
  const ownerEmail = ownerAuthUser?.user?.email ?? "—";

  const memberIds = (members ?? []).map((m) => m.id);
  const { data: accessRows } = memberIds.length
    ? await admin
        .from("team_member_project_access")
        .select("team_member_id, project_id")
        .in("team_member_id", memberIds)
        .returns<{ team_member_id: string; project_id: string }[]>()
    : { data: [] as { team_member_id: string; project_id: string }[] };

  const accessByMember = new Map<string, Set<string>>();
  for (const row of accessRows ?? []) {
    const set = accessByMember.get(row.team_member_id) ?? new Set<string>();
    set.add(row.project_id);
    accessByMember.set(row.team_member_id, set);
  }

  const t = await createTranslator(lang, TEAM_PAGE_LABELS);

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <h1 className="font-heading text-3xl font-extrabold uppercase tracking-tight">{t("Team")}</h1>

        {error && (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
        )}
        {checkout === "success" && (
          <p className="rounded-md bg-green-100 p-3 text-sm text-green-800">
            {t("Bedankt! Je abonnement wordt geactiveerd zodra Stripe de betaling bevestigt.")}
          </p>
        )}

        {organization && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Organisatie & abonnement")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-full bg-muted px-3 py-1 font-medium capitalize">
                  {t("Plan:")} {organization.plan}
                </span>
                <span className="rounded-full bg-muted px-3 py-1 font-medium capitalize">
                  {t("Status:")} {organization.subscription_status}
                </span>
                {organization.trial_ends_at && (
                  <span className="text-muted-foreground">
                    {t("Proefperiode tot")} {new Date(organization.trial_ends_at).toLocaleDateString("nl-NL")}
                  </span>
                )}
                {isOwner && organization.subscription_status !== "active" && (
                  <a
                    href="/api/stripe/checkout"
                    className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground hover:opacity-90"
                  >
                    {t("Upgraden")}
                  </a>
                )}
                {isOwner && organization.subscription_status === "active" && (
                  <a
                    href="/api/stripe/portal"
                    className="rounded-md border px-3 py-1 text-sm font-medium hover:bg-muted"
                  >
                    {t("Abonnement beheren")}
                  </a>
                )}
              </div>
              {isOwner && (
                <form action={updateOrganizationName} className="flex items-end gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="org-name">{t("Organisatienaam")}</Label>
                    <Input id="org-name" name="name" defaultValue={organization.name} className="w-64" required />
                  </div>
                  <Button type="submit" size="sm">
                    {t("Opslaan")}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Teamlid uitnodigen")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={inviteTeamMember} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_auto]">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("E-mail")}</Label>
                    <Input id="email" name="email" type="email" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">{t("Rol")}</Label>
                    <TeamRoleSelect id="role" t={t} />
                  </div>
                  <Button type="submit" className="self-end">
                    {t("Uitnodigen")}
                  </Button>
                </div>

                <div className="space-y-2 rounded-md border p-3">
                  <p className="text-sm font-medium">{t("Toegang tot projecten")}</p>
                  {!projects?.length ? (
                    <p className="text-xs text-muted-foreground">{t("Nog geen projecten aangemaakt.")}</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                      {projects.map((project) => (
                        <label key={project.id} className="flex items-center gap-1.5 text-sm">
                          <input type="checkbox" name="project_id" value={project.id} />
                          {project.name}
                        </label>
                      ))}
                    </div>
                  )}
                  <label className="flex items-center gap-1.5 pt-1 text-sm">
                    <input type="checkbox" name="can_view_budget" defaultChecked />
                    {t("Mag Begroting zien op zijn/haar projecten")}
                  </label>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Teamleden")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("E-mail")}</TableHead>
                  <TableHead>{t("Rol")}</TableHead>
                  <TableHead>{t("Sinds")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">{ownerEmail}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t("Eigenaar")}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">—</TableCell>
                  <TableCell />
                </TableRow>
                {(members ?? []).map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.invited_email}</TableCell>
                    <TableCell>
                      {isAdmin ? (
                        <form
                          action={updateTeamMemberRole.bind(null, member.id)}
                          className="flex items-center gap-1"
                        >
                          <TeamRoleSelect
                            key={member.role}
                            id={`role-${member.id}`}
                            defaultValue={member.role}
                            t={t}
                          />
                          <Button type="submit" size="sm" variant="ghost">
                            {t("Opslaan")}
                          </Button>
                        </form>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {t(TEAM_ROLE_LABELS[member.role])}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(member.created_at).toLocaleDateString("nl-NL")}
                    </TableCell>
                    <TableCell className="text-right">
                      {isAdmin && (
                        <form action={removeTeamMember.bind(null, member.id)}>
                          <Button type="submit" variant="ghost" size="sm">
                            {t("Verwijderen")}
                          </Button>
                        </form>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {isAdmin &&
                  (members ?? []).map((member) => {
                    const memberAccess = accessByMember.get(member.id) ?? new Set<string>();
                    return (
                      <TableRow key={`${member.id}-access`}>
                        <TableCell colSpan={4} className="bg-muted/30">
                          <details>
                            <summary className="cursor-pointer text-xs text-muted-foreground">
                              {t("Toegang beheren voor")} {member.invited_email}
                            </summary>
                            <form
                              action={updateTeamMemberAccess.bind(null, member.id)}
                              className="mt-2 space-y-2"
                            >
                              {!projects?.length ? (
                                <p className="text-xs text-muted-foreground">
                                  {t("Nog geen projecten aangemaakt.")}
                                </p>
                              ) : (
                                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                                  {projects.map((project) => (
                                    <label
                                      key={project.id}
                                      className="flex items-center gap-1.5 text-sm"
                                    >
                                      <input
                                        type="checkbox"
                                        name="project_id"
                                        value={project.id}
                                        defaultChecked={memberAccess.has(project.id)}
                                      />
                                      {project.name}
                                    </label>
                                  ))}
                                </div>
                              )}
                              <label className="flex items-center gap-1.5 text-sm">
                                <input
                                  type="checkbox"
                                  name="can_view_budget"
                                  defaultChecked={member.can_view_budget}
                                />
                                {t("Mag Begroting zien op zijn/haar projecten")}
                              </label>
                              <Button type="submit" size="sm" variant="secondary">
                                {t("Toegang opslaan")}
                              </Button>
                            </form>
                          </details>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
            {!members?.length && (
              <p className="mt-4 text-sm text-muted-foreground">
                {t("Nog geen teamleden uitgenodigd.")}
              </p>
            )}
          </CardContent>
        </Card>

        {isOwner && organization && (
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-base">{t("Gegevens & account")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">{t("Exporteer je gegevens")}</p>
                <p className="mb-2 text-sm text-muted-foreground">
                  {t("Download al je projecten, begrotingen, draaiboeken en teamgegevens als JSON-bestand.")}
                </p>
                <a
                  href="/api/export"
                  className="inline-block rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                >
                  {t("Download export")}
                </a>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium text-destructive">{t("Account verwijderen")}</p>
                <p className="mb-2 text-sm text-muted-foreground">
                  {t(
                    "Dit verwijdert direct en onomkeerbaar je hele organisatie: alle projecten, begrotingen, teamleden en klantaccounts. Typ de organisatienaam ("
                  )}
                  <strong>{organization.name}</strong>
                  {t(") ter bevestiging.")}
                </p>
                <form action={deleteOrganizationAccount} className="flex items-end gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmation_name">{t("Organisatienaam ter bevestiging")}</Label>
                    <Input id="confirmation_name" name="confirmation_name" className="w-64" required />
                  </div>
                  <Button type="submit" variant="destructive" size="sm">
                    {t("Verwijder account definitief")}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
