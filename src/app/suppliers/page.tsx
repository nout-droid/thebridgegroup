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

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*")
    .order("name", { ascending: true })
    .returns<Supplier[]>();

  const catalogCounts = new Map<string, number>();
  for (const supplier of suppliers ?? []) {
    const { count } = await supabase
      .from("catalog_articles")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", supplier.id);
    catalogCounts.set(supplier.id, count ?? 0);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <h1 className="text-2xl font-semibold">Leveranciers</h1>

        {error && (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nieuwe leverancier</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createSupplier} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Naam</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialties">Specialismen</Label>
                <Input id="specialties" name="specialties" placeholder="bv. audio, licht" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">E-mail</Label>
                <Input id="contact_email" name="contact_email" type="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Telefoon</Label>
                <Input id="contact_phone" name="contact_phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_discount_percentage">Standaard korting (%)</Label>
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
                Toevoegen
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alle leveranciers</CardTitle>
          </CardHeader>
          <CardContent>
            {!suppliers?.length ? (
              <p className="text-sm text-muted-foreground">Nog geen leveranciers toegevoegd.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Naam</TableHead>
                    <TableHead>Specialismen</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Korting</TableHead>
                    <TableHead>Catalogus</TableHead>
                    <TableHead>Portaal</TableHead>
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
                          <Button type="submit" size="sm" variant="ghost">
                            Opslaan
                          </Button>
                        </form>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span>{catalogCounts.get(supplier.id) ?? 0} artikelen</span>
                          <form action={uploadCatalog.bind(null, supplier.id)} className="flex items-center gap-1">
                            <Input
                              type="file"
                              name="file"
                              accept=".csv"
                              required
                              className="h-8 w-40 text-xs"
                            />
                            <Button type="submit" size="sm" variant="secondary">
                              Uploaden
                            </Button>
                          </form>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <details>
                          <summary className="cursor-pointer text-muted-foreground">
                            {supplier.portal_code
                              ? supplier.portal_password_hash
                                ? "ingesteld"
                                : "code, geen wachtwoord"
                              : "nog niet ingesteld"}
                          </summary>
                          <div className="mt-2 space-y-2">
                            <form
                              action={updateSupplierPortalCode.bind(null, supplier.id)}
                              className="flex items-center gap-1"
                            >
                              <Input
                                name="portal_code"
                                defaultValue={supplier.portal_code ?? ""}
                                placeholder="Code"
                                className="h-8 w-24 font-mono text-xs uppercase"
                                required
                              />
                              <Button type="submit" size="sm" variant="ghost">
                                Opslaan
                              </Button>
                            </form>
                            <form
                              action={setSupplierPassword.bind(null, supplier.id)}
                              className="flex items-center gap-1"
                            >
                              <Input
                                name="password"
                                type="password"
                                placeholder="Wachtwoord"
                                className="h-8 w-28 text-xs"
                                required
                              />
                              <Button type="submit" size="sm" variant="ghost">
                                Opslaan
                              </Button>
                            </form>
                          </div>
                        </details>
                      </TableCell>
                      <TableCell className="text-right">
                        <form action={deleteSupplier.bind(null, supplier.id)}>
                          <Button type="submit" variant="ghost" size="sm">
                            Verwijderen
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
