import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
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
import type { Supplier } from "@/lib/types";
import {
  createSupplier,
  deleteSupplier,
  setSupplierPassword,
  updateSupplierDiscount,
  updateSupplierPortalCode,
  uploadCatalog,
} from "./actions";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

const SUPPLIERS_PAGE_LABELS = [
  "Leveranciers",
  "Nieuwe leverancier",
  "Naam",
  "Specialismen",
  "bv. audio, licht",
  "E-mail",
  "Telefoon",
  "Standaard korting (%)",
  "Toevoegen",
  "Alle leveranciers",
  "Nog geen leveranciers toegevoegd.",
  "Contact",
  "Korting",
  "Catalogus",
  "Portaal",
  "Opslaan",
  "artikelen",
  "Uploaden",
  "Portaal: ingesteld",
  "Portaal: wachtwoord ontbreekt",
  "Portaal instellen",
  "Code",
  "Wachtwoord",
  "Verwijderen",
];

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  // headers() en de suppliers-query hebben geen onderlinge afhankelijkheid — parallel
  // opvragen i.p.v. na elkaar.
  const [headersList, { data: suppliers }, lang] = await Promise.all([
    headers(),
    supabase.from("suppliers").select("*").order("name", { ascending: true }).returns<Supplier[]>(),
    getAppLang(),
  ]);
  const host = headersList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  const supplierPortalUrl = `${protocol}://${host}/supplier-portal`;

  const t = await createTranslator(lang, SUPPLIERS_PAGE_LABELS);

  // Per leverancier het aantal catalogusartikelen tellen — deze tellingen zijn onderling
  // onafhankelijk, dus parallel i.p.v. één voor één na elkaar (N sequentiële round-trips).
  const catalogCounts = new Map<string, number>();
  await Promise.all(
    (suppliers ?? []).map(async (supplier) => {
      const { count } = await supabase
        .from("catalog_articles")
        .select("id", { count: "exact", head: true })
        .eq("supplier_id", supplier.id);
      catalogCounts.set(supplier.id, count ?? 0);
    })
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <h1 className="font-heading text-3xl font-extrabold uppercase tracking-tight">{t("Leveranciers")}</h1>

        {error && (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Nieuwe leverancier")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createSupplier} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">{t("Naam")}</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialties">{t("Specialismen")}</Label>
                <Input id="specialties" name="specialties" placeholder={t("bv. audio, licht")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">{t("E-mail")}</Label>
                <Input id="contact_email" name="contact_email" type="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">{t("Telefoon")}</Label>
                <Input id="contact_phone" name="contact_phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_discount_percentage">{t("Standaard korting (%)")}</Label>
                <Input
                  id="default_discount_percentage"
                  name="default_discount_percentage"
                  type="number"
                  step="0.1"
                  min={0}
                  max={100}
                  defaultValue={0}
                />
              </div>
              <Button type="submit" className="sm:col-span-2">
                {t("Toevoegen")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Alle leveranciers")}</CardTitle>
          </CardHeader>
          <CardContent>
            {!suppliers?.length ? (
              <p className="text-sm text-muted-foreground">{t("Nog geen leveranciers toegevoegd.")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Naam")}</TableHead>
                    <TableHead>{t("Specialismen")}</TableHead>
                    <TableHead>{t("Contact")}</TableHead>
                    <TableHead>{t("Korting")}</TableHead>
                    <TableHead>{t("Catalogus")}</TableHead>
                    <TableHead>{t("Portaal")}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell>{supplier.specialties}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {[supplier.contact_email, supplier.contact_phone]
                          .filter(Boolean)
                          .join(" · ")}
                      </TableCell>
                      <TableCell>
                        <form
                          action={updateSupplierDiscount.bind(null, supplier.id)}
                          className="flex items-center gap-1"
                        >
                          <Input
                            type="number"
                            name="default_discount_percentage"
                            step="0.1"
                            min={0}
                            max={100}
                            defaultValue={supplier.default_discount_percentage}
                            className="h-8 w-16 text-xs"
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                          <Button type="submit" size="sm" variant="ghost" className="shrink-0 whitespace-nowrap">
                            {t("Opslaan")}
                          </Button>
                        </form>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span>
                            {catalogCounts.get(supplier.id) ?? 0} {t("artikelen")}
                          </span>
                          <form action={uploadCatalog.bind(null, supplier.id)} className="flex items-center gap-1">
                            <Input
                              type="file"
                              name="file"
                              accept=".csv"
                              required
                              className="h-8 w-40 text-xs"
                            />
                            <Button type="submit" size="sm" variant="secondary" className="shrink-0 whitespace-nowrap">
                              {t("Uploaden")}
                            </Button>
                          </form>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <details>
                          <summary className="inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted">
                            {supplier.portal_code
                              ? supplier.portal_password_hash
                                ? t("Portaal: ingesteld")
                                : t("Portaal: wachtwoord ontbreekt")
                              : t("Portaal instellen")}
                          </summary>
                          <div className="mt-2 space-y-2">
                            <p className="text-xs text-muted-foreground">
                              <span className="font-mono">{supplierPortalUrl}</span>
                            </p>
                            <form
                              action={updateSupplierPortalCode.bind(null, supplier.id)}
                              className="flex items-center gap-1"
                            >
                              <Input
                                name="portal_code"
                                defaultValue={supplier.portal_code ?? ""}
                                placeholder={t("Code")}
                                className="h-8 w-24 font-mono text-xs uppercase"
                                required
                              />
                              <Button type="submit" size="sm" variant="ghost" className="shrink-0 whitespace-nowrap">
                                {t("Opslaan")}
                              </Button>
                            </form>
                            <form
                              action={setSupplierPassword.bind(null, supplier.id)}
                              className="flex items-center gap-1"
                            >
                              <Input
                                name="password"
                                type="password"
                                placeholder={t("Wachtwoord")}
                                className="h-8 w-28 text-xs"
                                required
                              />
                              <Button type="submit" size="sm" variant="ghost" className="shrink-0 whitespace-nowrap">
                                {t("Opslaan")}
                              </Button>
                            </form>
                          </div>
                        </details>
                      </TableCell>
                      <TableCell className="text-right">
                        <form action={deleteSupplier.bind(null, supplier.id)}>
                          <Button type="submit" variant="ghost" size="sm">
                            {t("Verwijderen")}
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
