import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import type { CrewMember } from "@/lib/types";
import { ProjectSubNav } from "../../project-sub-nav";
import { ProductionSubNav } from "../production-sub-nav";
import { HotelFlightsCard } from "../hotel-flights-card";

export default async function ProductionHotelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const project = await getProjectOrNotFound(supabase, id);

  const { data: hotelMembers } = await supabase
    .from("crew_members")
    .select("*")
    .eq("project_id", id)
    .eq("needs_hotel", true)
    .order("sort_order", { ascending: true })
    .returns<CrewMember[]>();

  const { data: flightMembers } = await supabase
    .from("crew_members")
    .select("*")
    .eq("project_id", id)
    .eq("needs_flight", true)
    .order("sort_order", { ascending: true })
    .returns<CrewMember[]>();

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
        />
      </main>
      <Footer />
    </div>
  );
}
