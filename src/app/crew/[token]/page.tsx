import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { CrewRundownView } from "./crew-rundown-view";

export default async function CrewPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ division?: string }>;
}) {
  const { token } = await params;
  const { division } = await searchParams;

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

  if (!isOwner) {
    const cookieStore = await cookies();
    if (!cookieStore.get(`crew_token_${token}`)) {
      redirect("/crew-portal");
    }
  }

  return <CrewRundownView token={token} initialDivision={division} />;
}
