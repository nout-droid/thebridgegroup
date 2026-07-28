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

  const { data: members } = await supabase
    .from("team_members")
    .select("*")
    .eq("owner_user_id", ownerId)
    .order("created_at", { ascending: true })
    .returns<TeamMember[]>();

  const viewerMembership = members?.find((m) => m.member_user_id === user.id);
  const isAdmin = isOwner || viewerMembership?.role === "admin";

  const admin = createAdminClient();
  const { data: ownerAuthUser } = await admin.auth.admin.getUserById(ownerId);
  const ownerEmail = ownerAuthUser?.user?.email ?? "—";

  const { data: organization } = await admin
    .from("organizations")
    .select("*")
    .eq("owner_user_id", ownerId)
    .maybeSingle<Organization>();

  const { data: projects } = await admin
    .from("projects")
    .select("id, name")
    .eq("user_id", ownerId)
    .order("name", { ascending: true })
    .returns<{ id: string; name: string }[]>();

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

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <h1 className="font-heading text-3xl font-extrabold uppercase tracking-tight">Team</h1>

        {error && (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
        )}
        {checkout === "success" && (
          <p className="rounded-md bg-green-100 p-3 text-sm text-green-800">
            Bedankt! Je abonnement wordt geactiveerd zodra Stripe de betaling bevestigt.
          </p>
        )}

        {organization && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Organisatie & abonnement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-full bg-muted px-3 py-1 font-medium capitalize">
                  Plan: {organization.plan}
                </span>
                <span className="rounded-full bg-muted px-3 py-1 font-medium capitalize">
                  Status: {organization.subscription_status}
                </span>
                {organization.trial_ends_at && (
                  <span className="text-muted-foreground">
                    Proefperiode tot {new Date(organization.trial_ends_at).toLocaleDateString("nl-NL")}
                  </span>
                )}
                {isOwner && organization.subscription_status !== "active" && (
                  <a
                    href="/api/stripe/checkout"
                    className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground hover:opacity-90"
                  >
                    Upgraden
                  </a>
                )}
                {isOwner && organization.subscription_status === "active" && (
                  <a
                    href="/api/stripe/portal"
                    className="rounded-md border px-3 py-1 text-sm font-medium hover:bg-muted"
                  >
                    Abonnement beheren
                  </a>
                )}
              </div>
              {isOwner && (
                <form action={updateOrganizationName} className="flex items-end gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="org-name">Organisatienaam</Label>
                    <Input id="org-name" name="name" defaultValue={organization.name} className="w-64" required />
                  </div>
                  <Button type="submit" size="sm">
                    Opslaan
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Teamlid uitnodigen</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={inviteTeamMember} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_auto]">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" name="email" type="email" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Rol</Label>
                    <TeamRoleSelect id="role" />
                  </div>
                  <Button type="submit" className="self-end">
                    Uitnodigen
                  </Button>
                </div>

                <div className="space-y-2 rounded-md border p-3">
                  <p className="text-sm font-medium">Toegang tot projecten</p>
                  {!projects?.length ? (
                    <p className="text-xs text-muted-foreground">Nog geen projecten aangemaakt.</p>
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
                    Mag Begroting zien op zijn/haar projecten
                  </label>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Teamleden</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Sinds</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">{ownerEmail}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">Eigenaar</TableCell>
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
                          />
                          <Button type="submit" size="sm" variant="ghost">
                            Opslaan
                          </Button>
                        </form>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {TEAM_ROLE_LABELS[member.role]}
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
                            Verwijderen
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
                              Toegang beheren voor {member.invited_email}
                            </summary>
                            <form
                              action={updateTeamMemberAccess.bind(null, member.id)}
                              className="mt-2 space-y-2"
                            >
                              {!projects?.length ? (
                                <p className="text-xs text-muted-foreground">
                                  Nog geen projecten aangemaakt.
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
                                Mag Begroting zien op zijn/haar projecten
                              </label>
                              <Button type="submit" size="sm" variant="secondary">
                                Toegang opslaan
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
                Nog geen teamleden uitgenodigd.
              </p>
            )}
          </CardContent>
        </Card>

        {isOwner && organization && (
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-base">Gegevens & account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Exporteer je gegevens</p>
                <p className="mb-2 text-sm text-muted-foreground">
                  Download al je projecten, begrotingen, draaiboeken en teamgegevens als JSON-bestand.
                </p>
                <a
                  href="/api/export"
                  className="inline-block rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                >
                  Download export
                </a>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium text-destructive">Account verwijderen</p>
                <p className="mb-2 text-sm text-muted-foreground">
                  Dit verwijdert direct en onomkeerbaar je hele organisatie: alle projecten,
                  begrotingen, teamleden en klantaccounts. Typ de organisatienaam (
                  <strong>{organization.name}</strong>) ter bevestiging.
                </p>
                <form action={deleteOrganizationAccount} className="flex items-end gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmation_name">Organisatienaam ter bevestiging</Label>
                    <Input id="confirmation_name" name="confirmation_name" className="w-64" required />
                  </div>
                  <Button type="submit" variant="destructive" size="sm">
                    Verwijder account definitief
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
