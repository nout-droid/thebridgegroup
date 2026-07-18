"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getTeamOwnerId } from "@/lib/server/team";

// Geen I/L/O/0/1 — voorkomt verwarring als een klant het Event ID moet overtypen.
const EVENT_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateEventCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += EVENT_CODE_CHARS[Math.floor(Math.random() * EVENT_CODE_CHARS.length)];
  }
  return code;
}

export async function createProject(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const clientName = String(formData.get("client_name") ?? "").trim();
  const eventDate = String(formData.get("event_date") ?? "");

  if (!name) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownerId = await getTeamOwnerId(supabase, user.id);

  let data: { id: string } | null = null;
  let error: { message: string; code?: string } | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const result = await supabase
      .from("projects")
      .insert({
        user_id: ownerId,
        name,
        client_name: clientName,
        event_date: eventDate || null,
        event_code: generateEventCode(),
      })
      .select("id")
      .single();

    data = result.data;
    error = result.error;

    if (!error || error.code !== "23505") break;
  }

  if (error || !data) {
    redirect(`/projects?error=${encodeURIComponent(error?.message ?? "Onbekende fout")}`);
  }

  revalidatePath("/projects");
  redirect(`/projects/${data.id}`);
}
