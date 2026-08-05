import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamOwnerId } from "@/lib/server/team";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ClientAccount } from "@/lib/types";
import {
  createClientAccount,
  deleteClientAccount,
  setClientAccountPassword,
  updateClientAccountSettings,
} from "./actions";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

const CLIENTS_PAGE_LABELS = [
  "Klanten",
  "Een klantaccount geeft een terugkerende opdrachtgever één inlog voor al hun projecten tegelijk, i.p.v. steeds een los Event ID per project. Het bestaande Event ID + wachtwoord per project blijft daarnaast gewoon bestaan als lichter alternatief.",
  "Nieuw klantaccount",
  "Naam",
  "E-mailadres",
  "Wachtwoord",
  "Openheid begroting",
  "Gesloten — alleen prijs per onderdeel",
  "Open — incl. inkoopprijs, marge, leverancier",
  "Mag aanvraag checklist invullen",
  "Mag verzoeken indienen (Productie-tab)",
  "Gekoppelde projecten",
  "Nog geen projecten aangemaakt.",
  "Klantaccount aanmaken",
  "Klantaccounts",
  "Nog geen klantaccounts aangemaakt.",
  "Open begroting",
  "Gesloten begroting",
  "project(en)",
  "Opslaan",
  "Nieuw wachtwoord",
  "Wachtwoord instellen",
  "Klantaccount verwijderen",
];

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerId = await getTeamOwnerId(supabase, user.id);
  const admin = createAdminClient();

  // De projectenlijst gaat via de gewone (RLS-respecterende) client i.p.v. de service-role
  // client: anders zag een teamlid met beperkte projecttoegang hier alsnog de namen van
  // ALLE projecten van de eigenaar in de "Gekoppelde projecten"-checkboxes, ook projecten
  // waar hij/zij geen toegang toe heeft. Deze pagina is niet naar rol gescreend, dus de
  // databeperking moet hier vandaan komen.
  //
  // Deze queries hebben alleen `ownerId` nodig (geen onderlinge afhankelijkheid) — in
  // één keer parallel opvragen i.p.v. na elkaar.
  const [{ data: accounts }, { data: projects }, lang] = await Promise.all([
    supabase
      .from("client_accounts")
      .select("*")
      .eq("owner_user_id", ownerId)
      .order("created_at", { ascending: false })
      .returns<ClientAccount[]>(),
    supabase
      .from("projects")
      .select("id, name")
      .eq("user_id", ownerId)
      .order("name", { ascending: true })
      .returns<{ id: string; name: string }[]>(),
    getAppLang(),
  ]);

  const accountIds = (accounts ?? []).map((a) => a.id);
  const { data: linkRows } = accountIds.length
    ? await admin
        .from("client_account_projects")
        .select("client_account_id, project_id")
        .in("client_account_id", accountIds)
        .returns<{ client_account_id: string; project_id: string }[]>()
    : { data: [] as { client_account_id: string; project_id: string }[] };

  const linksByAccount = new Map<string, Set<string>>();
  for (const row of linkRows ?? []) {
    const set = linksByAccount.get(row.client_account_id) ?? new Set<string>();
    set.add(row.project_id);
    linksByAccount.set(row.client_account_id, set);
  }

  const t = await createTranslator(lang, CLIENTS_PAGE_LABELS);

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <h1 className="font-heading text-3xl font-extrabold uppercase tracking-tight">{t("Klanten")}</h1>
        <p className="text-sm text-muted-foreground">
          {t(
            "Een klantaccount geeft een terugkerende opdrachtgever één inlog voor al hun projecten tegelijk, i.p.v. steeds een los Event ID per project. Het bestaande Event ID + wachtwoord per project blijft daarnaast gewoon bestaan als lichter alternatief."
          )}
        </p>

        {error && (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Nieuw klantaccount")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createClientAccount} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="new-name">{t("Naam")}</Label>
                  <Input id="new-name" name="name" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-email">{t("E-mailadres")}</Label>
                  <Input id="new-email" name="email" type="email" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">{t("Wachtwoord")}</Label>
                  <Input id="new-password" name="password" type="password" required />
                </div>
              </div>

              <div className="space-y-2 rounded-md border p-3">
                <p className="text-sm font-medium">{t("Openheid begroting")}</p>
                <select
                  name="budget_access"
                  defaultValue="closed"
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                >
                  <option value="closed">{t("Gesloten — alleen prijs per onderdeel")}</option>
                  <option value="open">{t("Open — incl. inkoopprijs, marge, leverancier")}</option>
                </select>
                <div className="flex flex-wrap gap-4 pt-1">
                  <label className="flex items-center gap-1.5 text-sm">
                    <input type="checkbox" name="can_edit_checklist" defaultChecked />
                    {t("Mag aanvraag checklist invullen")}
                  </label>
                  <label className="flex items-center gap-1.5 text-sm">
                    <input type="checkbox" name="can_submit_requests" defaultChecked />
                    {t("Mag verzoeken indienen (Productie-tab)")}
                  </label>
                </div>
              </div>

              <div className="space-y-2 rounded-md border p-3">
                <p className="text-sm font-medium">{t("Gekoppelde projecten")}</p>
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
              </div>

              <Button type="submit">{t("Klantaccount aanmaken")}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Klantaccounts")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!accounts?.length ? (
              <p className="text-sm text-muted-foreground">{t("Nog geen klantaccounts aangemaakt.")}</p>
            ) : (
              accounts.map((account) => {
                const linkedProjects = linksByAccount.get(account.id) ?? new Set<string>();
                return (
                  <details key={account.id} className="rounded-md border p-3">
                    <summary className="flex cursor-pointer items-center justify-between gap-2">
                      <span className="font-medium">
                        {account.name}{" "}
                        <span className="font-normal text-muted-foreground">({account.email})</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {account.budget_access === "open" ? t("Open begroting") : t("Gesloten begroting")}
                        </Badge>
                        <Badge variant="outline">{linkedProjects.size} {t("project(en)")}</Badge>
                      </span>
                    </summary>

                    <div className="mt-3 space-y-4 border-t pt-3">
                      <form
                        action={updateClientAccountSettings.bind(null, account.id)}
                        className="space-y-3"
                      >
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label htmlFor={`name-${account.id}`}>{t("Naam")}</Label>
                            <Input id={`name-${account.id}`} name="name" defaultValue={account.name} />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`budget-${account.id}`}>{t("Openheid begroting")}</Label>
                            <select
                              id={`budget-${account.id}`}
                              name="budget_access"
                              defaultValue={account.budget_access}
                              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                            >
                              <option value="closed">{t("Gesloten — alleen prijs per onderdeel")}</option>
                              <option value="open">{t("Open — incl. inkoopprijs, marge, leverancier")}</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center gap-1.5 text-sm">
                            <input
                              type="checkbox"
                              name="can_edit_checklist"
                              defaultChecked={account.can_edit_checklist}
                            />
                            {t("Mag aanvraag checklist invullen")}
                          </label>
                          <label className="flex items-center gap-1.5 text-sm">
                            <input
                              type="checkbox"
                              name="can_submit_requests"
                              defaultChecked={account.can_submit_requests}
                            />
                            {t("Mag verzoeken indienen (Productie-tab)")}
                          </label>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-sm font-medium">{t("Gekoppelde projecten")}</p>
                          {!projects?.length ? (
                            <p className="text-xs text-muted-foreground">{t("Nog geen projecten aangemaakt.")}</p>
                          ) : (
                            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                              {projects.map((project) => (
                                <label key={project.id} className="flex items-center gap-1.5 text-sm">
                                  <input
                                    type="checkbox"
                                    name="project_id"
                                    value={project.id}
                                    defaultChecked={linkedProjects.has(project.id)}
                                  />
                                  {project.name}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button type="submit" size="sm">
                          {t("Opslaan")}
                        </Button>
                      </form>

                      <form
                        action={setClientAccountPassword.bind(null, account.id)}
                        className="flex items-end gap-2"
                      >
                        <div className="space-y-1.5">
                          <Label htmlFor={`pw-${account.id}`}>{t("Nieuw wachtwoord")}</Label>
                          <Input id={`pw-${account.id}`} name="password" type="password" className="w-48" />
                        </div>
                        <Button type="submit" size="sm" variant="secondary">
                          {t("Wachtwoord instellen")}
                        </Button>
                      </form>

                      <form action={deleteClientAccount.bind(null, account.id)}>
                        <Button type="submit" size="sm" variant="ghost" className="text-destructive">
                          {t("Klantaccount verwijderen")}
                        </Button>
                      </form>
                    </div>
                  </details>
                );
              })
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
