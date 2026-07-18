import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { ShowcallerView } from "./showcaller-view";

export default async function ShowcallerPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!isSupabaseConfigured) {
    return <p className="p-6 text-sm text-muted-foreground">Deze pagina is nog niet beschikbaar.</p>;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isOwner = false;
  if (user) {
    const { data: ownedProject } = await supabase
      .from("projects")
      .select("id")
      .eq("share_token", token)
      .maybeSingle();
    isOwner = Boolean(ownedProject);
  }

  let restrictedStageId: string | null = null;
  if (!isOwner) {
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(`showcaller_token_${token}`)?.value;
    if (!cookieValue) {
      redirect("/showcaller-portal");
    }
    restrictedStageId = cookieValue !== "all" ? cookieValue : null;
  }

  return <ShowcallerView token={token} restrictedStageId={restrictedStageId} />;
}
