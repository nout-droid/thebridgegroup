import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { computeCo2Total, FLIGHT_CO2_KG, KM_CO2_KG_PER_KM } from "@/lib/co2";

function formatKg(kg: number) {
  return `${Math.round(kg).toLocaleString("nl-NL")} kg`;
}

export default async function Co2Page() {
  const supabase = await createClient();

  const [{ data: projects }, { data: flights }, { data: categories }, { data: quotes }] =
    await Promise.all([
      supabase.from("projects").select("id, name").order("name", { ascending: true }),
      supabase.from("crew_members").select("project_id").eq("needs_flight", true),
      supabase.from("categories").select("project_id, estimated_km").not("estimated_km", "is", null),
      supabase
        .from("quotes")
        .select("co2_kg, category:categories(project_id)")
        .not("co2_kg", "is", null),
    ]);

  const flightCountByProject = new Map<string, number>();
  for (const row of flights ?? []) {
    flightCountByProject.set(row.project_id, (flightCountByProject.get(row.project_id) ?? 0) + 1);
  }

  const kmByProject = new Map<string, number>();
  for (const row of categories ?? []) {
    kmByProject.set(
      row.project_id,
      (kmByProject.get(row.project_id) ?? 0) + (row.estimated_km ?? 0)
    );
  }

  const quoteKgByProject = new Map<string, number>();
  for (const row of quotes ?? []) {
    const category = row.category as { project_id: string } | { project_id: string }[] | null;
    const projectId = Array.isArray(category) ? category[0]?.project_id : category?.project_id;
    if (!projectId) continue;
    quoteKgByProject.set(projectId, (quoteKgByProject.get(projectId) ?? 0) + (row.co2_kg ?? 0));
  }

  const rows = (projects ?? []).map((project) => {
    const co2 = computeCo2Total(
      flightCountByProject.get(project.id) ?? 0,
      kmByProject.get(project.id) ?? 0,
      quoteKgByProject.get(project.id) ?? 0
    );
    return { project, co2, flightCount: flightCountByProject.get(project.id) ?? 0 };
  });

  const grandTotal = computeCo2Total(
    [...flightCountByProject.values()].reduce((sum, n) => sum + n, 0),
    [...kmByProject.values()].reduce((sum, n) => sum + n, 0),
    [...quoteKgByProject.values()].reduce((sum, n) => sum + n, 0)
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <div>
          <h1 className="font-heading text-3xl font-extrabold uppercase tracking-tight">CO2-tracker</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Een indicatie van de CO2-uitstoot die we als Bridge AV Group opbouwen aan vluchten en
            transport, over al onze projecten heen. Bedoeld als bewustwording, niet als exacte
            meting.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Totaal opgebouwd</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-primary">🌱 {formatKg(grandTotal.totalKg)}</p>
            <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Vluchten (crew)</dt>
                <dd className="font-medium">{formatKg(grandTotal.flightKg)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Transport (km-stelposten)</dt>
                <dd className="font-medium">{formatKg(grandTotal.kmKg)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Leveranciers (opgegeven)</dt>
                <dd className="font-medium">{formatKg(grandTotal.quoteKg)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Per project</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Vluchten</TableHead>
                  <TableHead>Transport</TableHead>
                  <TableHead>Leveranciers</TableHead>
                  <TableHead className="text-right">Totaal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ project, co2, flightCount }) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {flightCount > 0 ? `${flightCount}x · ${formatKg(co2.flightKg)}` : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {co2.kmKg > 0 ? formatKg(co2.kmKg) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {co2.quoteKg > 0 ? formatKg(co2.quoteKg) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatKg(co2.totalKg)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!rows.length && (
              <p className="mt-4 text-sm text-muted-foreground">Nog geen projecten.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hoe wordt dit berekend?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>Vluchten:</strong> elk crewlid met &ldquo;Vliegticket nodig&rdquo; aangevinkt
              telt voor een vaste {FLIGHT_CO2_KG} kg — een grove gemiddelde retourvlucht,
              korte/middellange afstand, omdat we geen exacte routes bijhouden.
            </p>
            <p>
              <strong>Transport:</strong> de som van alle ingevulde &ldquo;geschatte km&rdquo;
              -stelposten op categorieën (bv. kilometervergoeding), tegen {KM_CO2_KG_PER_KM} kg per
              km — een gemiddelde voor wegtransport.
            </p>
            <p>
              <strong>Leveranciers:</strong> als een leverancier bij een offerte zelf een CO2-cijfer
              (kg) opgeeft, telt dat rechtstreeks mee.
            </p>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
