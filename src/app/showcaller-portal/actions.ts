"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function showcallerLogin(formData: FormData) {
  const eventCode = String(formData.get("event_code") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!eventCode || !password) {
    redirect(`/showcaller-portal?error=${encodeURIComponent("Vul een Event ID en wachtwoord in.")}`);
  }

  const supabase = await createClient();
  const { data: result } = await supabase.rpc("verify_showcaller_login", {
    p_event_code: eventCode,
    p_password: password,
  });
  const login = result as { share_token: string; stage_id: string | null } | null;

  if (!login?.share_token) {
    redirect(`/showcaller-portal?error=${encodeURIComponent("Ongeldig Event ID of wachtwoord.")}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(`showcaller_token_${login.share_token}`, login.stage_id ?? "all", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  redirect(`/showcaller/${login.share_token}`);
}
