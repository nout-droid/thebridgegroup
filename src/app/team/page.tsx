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
import type { AuditLogEntry, Organization, TeamMember, TeamRoleDef } from "@/lib/types";
import { TEAM_ROLE_LABELS, NAV_SECTION_OPTIONS } from "@/lib/types";
import { TeamRoleSelect } from "./role-select";
import { ensureDefaultTeamRoles } from "@/lib/server/ensure-team-roles";
import {
  inviteTeamMember,
  updateTeamMemberRole,
  updateTeamMemberAccess,
  removeTeamMember,
  createTeamRole,
  updateTeamRole,
  deleteTeamRole,
} from "./actions";
import {
  updateOrganizationName,
  updateOrganizationBranding,
  updateOrganizationIban,
  deleteOrganizationAccount,
} from "./organization-actions";
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
  "Huisstijl (logo + kleur)",
  "Je eigen logo en accentkleur verschijnen in de navigatie, portalen en gedownloade PDF's.",
  "Logo",
  "Accentkleur",
  "Bankgegevens",
  "IBAN — verschijnt als betaalinstructie onderaan elke gedownloade factuur.",
  "IBAN",
  "Logboek",
  "Wie deed wat, voor gevoelige acties zoals projectverwijdering en teamwijzigingen.",
  "Actie",
  "Details",
  "Wanneer",
  "Nog geen acties gelogd.",
  "Rollen & rechten",
  "Uitbreidbare rechtenprofielen — Management, Technisch producent, Sales, Planner en Crew staan klaar als startpunt, en je kunt ze aanpassen of aanvullen. Een rol bepaalt of iemand alle projecten ziet of alleen toegewezen projecten, wel/geen begroting, wel/geen bewerkrechten, en welke onderdelen in de navigatie verschijnen.",
  "Naam",
  "Alle projecten zien (i.p.v. alleen toegewezen)",
  "Mag Begroting zien",
  "Mag bewerken (i.p.v. alleen bekijken)",
  "Zichtbare onderdelen",
  "Opslaan",
  "Verwijderen",
  "Nieuwe rol",
  "Rol toevoegen",
  "Rol (rechtenprofiel)",
  "Geen rol (klassiek: alleen toegewezen projecten, admin-rol hierboven bepaalt teambeheer)",
  ...Object.values(TEAM_ROLE_LABELS),
  ...NAV_SECTION_OPTIONS.map((o) => o.label),
];

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "zojuist";
  if (minutes < 60) return `${minutes} min geleden`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} uur geleden`;
  const days = Math.floor(hours / 24);
  return `${days} dag${days === 1 ? "" : "en"} geleden`;
}

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
    { data: auditLog },
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
    admin
      .from("audit_log")
      .select("*")
      .eq("owner_user_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<AuditLogEntry[]>(),
    getAppLang(),
  ]);

  const viewerMembership = members?.find((m) => m.member_user_id === user.id);
  const isAdmin = isOwner || viewerMembership?.role === "admin";
  const ownerEmail = ownerAuthUser?.user?.email ?? "—";

  // Alleen beheerders mogen rollen aanmaken (RLS-insert is admin-only), dus alleen voor hen
  // de standaardrollen seeden — anders blijft de lijst leeg voor gewone leden (die hebben
  // ook geen rollenbeheer-UI nodig).
  const roles: TeamRoleDef[] = isAdmin ? await ensureDefaultTeamRoles(supabase, ownerId) : [];

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
                    href="/pricing"
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
              {isOwner && (
                <div className="space-y-3 border-t pt-4">
                  <Label>{t("Huisstijl (logo + kleur)")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Je eigen logo en accentkleur verschijnen in de navigatie, portalen en gedownloade PDF's."
                    )}
                  </p>
                  <form action={updateOrganizationBranding} className="flex flex-wrap items-end gap-3">
                    {organization.logo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={organization.logo_url}
                        alt={organization.name}
                        className="h-10 w-10 rounded border object-contain"
                      />
                    )}
                    <div className="space-y-1.5">
                      <Label htmlFor="org-logo">{t("Logo")}</Label>
                      <Input id="org-logo" name="logo" type="file" accept="image/*" className="w-56" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="org-brand-color">{t("Accentkleur")}</Label>
                      <Input
                        id="org-brand-color"
                        name="brand_color"
                        type="color"
                        defaultValue={organization.brand_color ?? "#7CFC6E"}
                        className="h-9 w-16 p-1"
                      />
                    </div>
                    <Button type="submit" size="sm">
                      {t("Opslaan")}
                    </Button>
                  </form>
                </div>
              )}
              {isOwner && (
                <div className="space-y-3 border-t pt-4">
                  <Label>{t("Bankgegevens")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("IBAN — verschijnt als betaalinstructie onderaan elke gedownloade factuur.")}
                  </p>
                  <form action={updateOrganizationIban} className="flex flex-wrap items-end gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="org-iban">{t("IBAN")}</Label>
                      <Input
                        id="org-iban"
                        name="iban"
                        defaultValue={organization.iban ?? ""}
                        placeholder="NL00 BANK 0000 0000 00"
                        className="w-64"
                      />
                    </div>
                    <Button type="submit" size="sm">
                      {t("Opslaan")}
                    </Button>
                  </form>
                </div>
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

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Rollen & rechten")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t(
                  "Uitbreidbare rechtenprofielen — Management, Technisch producent, Sales, Planner en Crew staan klaar als startpunt, en je kunt ze aanpassen of aanvullen. Een rol bepaalt of iemand alle projecten ziet of alleen toegewezen projecten, wel/geen begroting, wel/geen bewerkrechten, en welke onderdelen in de navigatie verschijnen."
                )}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {roles.map((role) => (
                <details key={role.id} className="rounded-md border p-3">
                  <summary className="cursor-pointer text-sm font-medium">{t(role.name)}</summary>
                  <form
                    action={updateTeamRole.bind(null, role.id)}
                    className="mt-3 space-y-3 border-t pt-3"
                  >
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t("Naam")}</Label>
                      <Input name="name" defaultValue={role.name} className="h-8 max-w-xs text-xs" required />
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-1.5 text-xs">
                        <input type="checkbox" name="all_projects" defaultChecked={role.all_projects} className="h-4 w-4" />
                        {t("Alle projecten zien (i.p.v. alleen toegewezen)")}
                      </label>
                      <label className="flex items-center gap-1.5 text-xs">
                        <input type="checkbox" name="can_view_budget" defaultChecked={role.can_view_budget} className="h-4 w-4" />
                        {t("Mag Begroting zien")}
                      </label>
                      <label className="flex items-center gap-1.5 text-xs">
                        <input type="checkbox" name="can_edit" defaultChecked={role.can_edit} className="h-4 w-4" />
                        {t("Mag bewerken (i.p.v. alleen bekijken)")}
                      </label>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t("Zichtbare onderdelen")}</Label>
                      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                        {NAV_SECTION_OPTIONS.map((option) => (
                          <label key={option.value} className="flex items-center gap-1.5 text-xs">
                            <input
                              type="checkbox"
                              name="nav_sections"
                              value={option.value}
                              defaultChecked={role.nav_sections.includes(option.value)}
                              className="h-4 w-4"
                            />
                            {t(option.label)}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="submit" size="sm" className="h-7 text-xs">
                        {t("Opslaan")}
                      </Button>
                      <Button
                        type="submit"
                        formAction={deleteTeamRole.bind(null, role.id)}
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive"
                      >
                        {t("Verwijderen")}
                      </Button>
                    </div>
                  </form>
                </details>
              ))}

              <details className="rounded-md border p-3">
                <summary className="cursor-pointer text-sm font-medium">{t("Nieuwe rol")}</summary>
                <form action={createTeamRole} className="mt-3 space-y-3 border-t pt-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("Naam")}</Label>
                    <Input name="name" className="h-8 max-w-xs text-xs" required />
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-1.5 text-xs">
                      <input type="checkbox" name="all_projects" className="h-4 w-4" />
                      {t("Alle projecten zien (i.p.v. alleen toegewezen)")}
                    </label>
                    <label className="flex items-center gap-1.5 text-xs">
                      <input type="checkbox" name="can_view_budget" defaultChecked className="h-4 w-4" />
                      {t("Mag Begroting zien")}
                    </label>
                    <label className="flex items-center gap-1.5 text-xs">
                      <input type="checkbox" name="can_edit" defaultChecked className="h-4 w-4" />
                      {t("Mag bewerken (i.p.v. alleen bekijken)")}
                    </label>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("Zichtbare onderdelen")}</Label>
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                      {NAV_SECTION_OPTIONS.map((option) => (
                        <label key={option.value} className="flex items-center gap-1.5 text-xs">
                          <input type="checkbox" name="nav_sections" value={option.value} className="h-4 w-4" />
                          {t(option.label)}
                        </label>
                      ))}
                    </div>
                  </div>
                  <Button type="submit" size="sm" className="h-7 text-xs">
                    {t("Rol toevoegen")}
                  </Button>
                </form>
              </details>
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
                              {roles.length > 0 && (
                                <div className="space-y-1">
                                  <Label className="text-xs">{t("Rol (rechtenprofiel)")}</Label>
                                  <select
                                    name="role_id"
                                    defaultValue={member.role_id ?? ""}
                                    className="h-8 w-full max-w-xs rounded-md border bg-background px-2 text-xs"
                                  >
                                    <option value="">
                                      {t("Geen rol (klassiek: alleen toegewezen projecten, admin-rol hierboven bepaalt teambeheer)")}
                                    </option>
                                    {roles.map((role) => (
                                      <option key={role.id} value={role.id}>
                                        {t(role.name)}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
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

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Logboek")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("Wie deed wat, voor gevoelige acties zoals projectverwijdering en teamwijzigingen.")}
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("E-mail")}</TableHead>
                    <TableHead>{t("Actie")}</TableHead>
                    <TableHead>{t("Details")}</TableHead>
                    <TableHead>{t("Wanneer")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(auditLog ?? []).map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.actor_label}</TableCell>
                      <TableCell>{entry.action}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{entry.details}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {relativeTime(entry.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!auditLog?.length && (
                <p className="mt-4 text-sm text-muted-foreground">{t("Nog geen acties gelogd.")}</p>
              )}
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
