import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import type { Category, CrewMember, Quote, Supplier } from "@/lib/types";
import { ProjectSubNav } from "../../project-sub-nav";
import { ProductionSubNav } from "../production-sub-nav";
import { HotelFlightsCard, HOTEL_FLIGHTS_CARD_LABELS } from "../hotel-flights-card";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

function pickQuote(quotes: Quote[]): Quote | null {
  return quotes.find((q) => q.status === "gekozen") ?? quotes[0] ?? null;
}

export default async function ProductionHotelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Deze queries hebben alleen `id` nodig — dus in één keer parallel opvragen i.p.v. na
  // elkaar, anders wacht elke pageload op losse round-trips naar Supabase.
  const [project, { data: hotelMembers }, { data: flightMembers }, { data: suppliers }, { data: costCategories }, lang] =
    await Promise.all([
      getProjectOrNotFound(supabase, id),
      supabase
        .from("crew_members")
        .select("*")
        .eq("project_id", id)
        .eq("needs_hotel", true)
        .order("sort_order", { ascending: true })
        .returns<CrewMember[]>(),
      supabase
        .from("crew_members")
        .select("*")
        .eq("project_id", id)
        .eq("needs_flight", true)
        .order("sort_order", { ascending: true })
        .returns<CrewMember[]>(),
      supabase.from("suppliers").select("*").order("name", { ascending: true }).limit(500).returns<Supplier[]>(),
      supabase
        .from("categories")
        .select("*")
        .eq("project_id", id)
        .is("stage_id", null)
        .in("name", ["Hotel", "Vluchten"])
        .returns<Category[]>(),
      getAppLang(),
    ]);

  const hotelCategory = costCategories?.find((c) => c.name === "Hotel") ?? null;
  const flightCategory = costCategories?.find((c) => c.name === "Vluchten") ?? null;

  const categoryIds = [hotelCategory?.id, flightCategory?.id].filter((v): v is string => Boolean(v));
  const { data: costQuotes } = categoryIds.length
    ? await supabase.from("quotes").select("*").in("category_id", categoryIds).returns<Quote[]>()
    : { data: [] as Quote[] };

  const hotelQuote = hotelCategory
    ? pickQuote((costQuotes ?? []).filter((q) => q.category_id === hotelCategory.id))
    : null;
  const flightQuote = flightCategory
    ? pickQuote((costQuotes ?? []).filter((q) => q.category_id === flightCategory.id))
    : null;

  const t = await createTranslator(lang, HOTEL_FLIGHTS_CARD_LABELS);

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="production" />
      <ProductionSubNav projectId={project.id} active="hotel" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <HotelFlightsCard
          projectId={project.id}
          hotelMembers={hotelMembers ?? []}
          flightMembers={flightMembers ?? []}
          suppliersManageTravel={project.suppliers_manage_travel}
          suppliers={suppliers ?? []}
          hotelCategory={hotelCategory}
          hotelQuote={hotelQuote}
          flightCategory={flightCategory}
          flightQuote={flightQuote}
          t={t}
        />
      </main>
      <Footer />
    </div>
  );
}
