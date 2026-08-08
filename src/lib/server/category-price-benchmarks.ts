import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface PriceBenchmark {
  avg: number;
  count: number;
}

// Historisch gemiddelde inkoopprijs per categorienaam (getrimd, zelfde group-by-sleutel als
// de "Gemiddelde overschrijding per categorie"-kaart op /analytics), over alle projecten van
// deze eigenaar heen — gebruikt om een individuele offerte tegen af te zetten zodra hij wordt
// toegevoegd of bekeken. Alleen offertes met een al ingevulde prijs tellen mee.
export async function getCategoryPriceBenchmarks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  ownerId: string
): Promise<Map<string, PriceBenchmark>> {
  const { data } = await supabase
    .from("quotes")
    .select("cost_price, category:categories!inner(name, project:projects!inner(user_id))")
    .gt("cost_price", 0)
    .eq("category.project.user_id", ownerId);

  const byName = new Map<string, number[]>();
  for (const row of (data ?? []) as { cost_price: number; category: { name: string } | { name: string }[] | null }[]) {
    const category = Array.isArray(row.category) ? row.category[0] : row.category;
    if (!category) continue;
    const name = category.name.trim();
    if (!name) continue;
    const list = byName.get(name) ?? [];
    list.push(row.cost_price);
    byName.set(name, list);
  }

  const benchmarks = new Map<string, PriceBenchmark>();
  for (const [name, prices] of byName) {
    benchmarks.set(name, { avg: prices.reduce((sum, p) => sum + p, 0) / prices.length, count: prices.length });
  }
  return benchmarks;
}

// Vlag alleen bij voldoende historie (>=2 andere datapunten) en een forse afwijking — anders
// is het ruis in plaats van een zinvol signaal.
export function priceDeviation(costPrice: number, benchmark: PriceBenchmark | undefined): number | null {
  if (!benchmark || benchmark.count < 2 || benchmark.avg <= 0) return null;
  const pct = ((costPrice - benchmark.avg) / benchmark.avg) * 100;
  if (Math.abs(pct) < 30) return null;
  return pct;
}
