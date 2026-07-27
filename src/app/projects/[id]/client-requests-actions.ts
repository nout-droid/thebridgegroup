"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateClientRequestStatus(
  projectId: string,
  requestId: string,
  status: "new" | "acknowledged" | "done"
) {
  const supabase = await createClient();
  await supabase.from("client_requests").update({ status }).eq("id", requestId);
  revalidatePath(`/projects/${projectId}`);
}
