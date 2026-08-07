import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import type { EventType, GuestCateringOrder, SharedGuestDietary, Stage, Supplier } from "@/lib/types";
import { ProjectSubNav } from "../../project-sub-nav";
import { ProductionSubNav } from "../production-sub-nav";
import { GuestCateringCard, GUEST_CATERING_CARD_LABELS } from "../guest-catering-card";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

export default async function ProductionGuestCateringPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [project, { data: orders }, { data: suppliers }, { data: stages }, { data: guests }, lang] =
    await Promise.all([
      getProjectOrNotFound(supabase, id),
      supabase
        .from("guest_catering_orders")
        .select("*")
        .eq("project_id", id)
        .order("sort_order", { ascending: true })
        .returns<GuestCateringOrder[]>(),
      supabase.from("suppliers").select("*").order("name", { ascending: true }).returns<Supplier[]>(),
      supabase
        .from("stages")
        .select("*")
        .eq("project_id", id)
        .order("sort_order", { ascending: true })
        .returns<Stage[]>(),
      supabase
        .from("event_guests")
        .select("name, plus_one_name, dietary_notes")
        .eq("project_id", id)
        .neq("dietary_notes", "")
        .order("sort_order", { ascending: true }),
      getAppLang(),
    ]);

  const t = await createTranslator(lang, GUEST_CATERING_CARD_LABELS);
  const dietary: SharedGuestDietary[] = guests ?? [];

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="production" />
      <ProductionSubNav projectId={project.id} active="guest-catering" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <GuestCateringCard
          projectId={project.id}
          eventType={(project.event_type as EventType) ?? "festival"}
          orders={orders ?? []}
          dietary={dietary}
          suppliers={suppliers ?? []}
          stages={stages ?? []}
          t={t}
        />
      </main>
      <Footer />
    </div>
  );
}
