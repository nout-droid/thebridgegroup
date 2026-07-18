import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { ShareView } from "./share-view";

export default async function SharePage({
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

  if (!isOwner) {
    const cookieStore = await cookies();
    const unlocked = cookieStore.get(`client_token_${token}`);
    if (!unlocked) {
      redirect("/portal");
    }
  }

  return <ShareView token={token} />;
}
