import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface SupplierScorecard {
  score: number;
  ratingScore: number | null;
  priceScore: number | null;
  experienceScore: number;
  avgPriceDeviationPct: number | null;
  quoteCount: number;
}

type QuoteRow = {
  supplier_id: string;
  cost_price: number;
  status: string;
  category: { name: string } | { name: string }[] | null;
};

// Combineert drie signalen tot één score (0-100) per leverancier, over alle projecten van
// deze eigenaar heen: beoordeling (evaluatiepagina), prijsconcurrentie (t.o.v. het historisch
// categoriegemiddelde — zelfde bron als de prijsafwijking-waarschuwing op de begrotingspagina)
// en ervaring (aantal gekozen offertes). Ontbrekende signalen (bv. nog geen rating) tellen niet
// mee — het gewicht herverdeelt zich dan over de signalen die er wel zijn.
export async function getSupplierScorecards(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  ownerId: string,
  avgRatings: Map<string, { avg: number; count: number }>
): Promise<Map<string, SupplierScorecard>> {
  const { data } = await supabase
    .from("quotes")
    .select("supplier_id, cost_price, status, category:categories!inner(name, project:projects!inner(user_id))")
    .gt("cost_price", 0)
    .eq("category.project.user_id", ownerId)
    .returns<QuoteRow[]>();

  const rows = data ?? [];

  // Stap 1: categoriegemiddelden (zelfde als getCategoryPriceBenchmarks) om individuele
  // offertes tegen af te zetten.
  const pricesByCategory = new Map<string, number[]>();
  for (const row of rows) {
    const category = Array.isArray(row.category) ? row.category[0] : row.category;
    if (!category) continue;
    const name = category.name.trim();
    if (!name) continue;
    const list = pricesByCategory.get(name) ?? [];
    list.push(row.cost_price);
    pricesByCategory.set(name, list);
  }
  const categoryAvg = new Map<string, { avg: number; count: number }>();
  for (const [name, prices] of pricesByCategory) {
    categoryAvg.set(name, { avg: prices.reduce((s, p) => s + p, 0) / prices.length, count: prices.length });
  }

  // Stap 2: per leverancier de afwijking t.o.v. dat categoriegemiddelde verzamelen, plus
  // aantal gekozen offertes als ervaringssignaal.
  const deviationsBySupplier = new Map<string, number[]>();
  const chosenCountBySupplier = new Map<string, number>();
  for (const row of rows) {
    const category = Array.isArray(row.category) ? row.category[0] : row.category;
    if (!category) continue;
    const name = category.name.trim();
    const benchmark = categoryAvg.get(name);
    if (benchmark && benchmark.count >= 2 && benchmark.avg > 0) {
      const pct = ((row.cost_price - benchmark.avg) / benchmark.avg) * 100;
      const list = deviationsBySupplier.get(row.supplier_id) ?? [];
      list.push(pct);
      deviationsBySupplier.set(row.supplier_id, list);
    }
    if (row.status === "gekozen") {
      chosenCountBySupplier.set(row.supplier_id, (chosenCountBySupplier.get(row.supplier_id) ?? 0) + 1);
    }
  }

  const supplierIds = new Set([
    ...avgRatings.keys(),
    ...deviationsBySupplier.keys(),
    ...chosenCountBySupplier.keys(),
  ]);

  const scorecards = new Map<string, SupplierScorecard>();
  for (const supplierId of supplierIds) {
    const rating = avgRatings.get(supplierId);
    const ratingScore = rating ? (rating.avg / 5) * 100 : null;

    const deviations = deviationsBySupplier.get(supplierId);
    const avgDeviationPct = deviations?.length
      ? deviations.reduce((s, d) => s + d, 0) / deviations.length
      : null;
    // Goedkoper dan gemiddeld (negatieve afwijking) scoort hoog, duurder scoort laag —
    // -20% of goedkoper is 100 punten, +40% of duurder is 0 punten, lineair ertussen.
    const priceScore = avgDeviationPct == null ? null : Math.max(0, Math.min(100, 100 - ((avgDeviationPct + 20) / 60) * 100));

    const quoteCount = chosenCountBySupplier.get(supplierId) ?? 0;
    const experienceScore = Math.min(100, quoteCount * 20);

    // Gewicht herverdeelt zich over de signalen die er zijn — experienceScore is er altijd
    // (0 bij geen gekozen offertes), rating/prijs alleen als er data voor is.
    const weights: [number, number, number] = [ratingScore != null ? 0.5 : 0, priceScore != null ? 0.3 : 0, 0.2];
    const totalWeight = weights[0] + weights[1] + weights[2];
    const weightedSum =
      (ratingScore ?? 0) * weights[0] + (priceScore ?? 0) * weights[1] + experienceScore * weights[2];
    const score = weightedSum / totalWeight;

    scorecards.set(supplierId, {
      score: Math.round(score),
      ratingScore,
      priceScore,
      experienceScore,
      avgPriceDeviationPct: avgDeviationPct,
      quoteCount,
    });
  }

  return scorecards;
}
