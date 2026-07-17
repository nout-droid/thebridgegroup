"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function clientLogin(formData: FormData) {
  const eventCode = String(formData.get("event_code") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!eventCode || !password) {
    redirect(`/portal?error=${encodeURIComponent("Vul een Event ID en wachtwoord in.")}`);
  }

  const supabase = await createClient();
  const { data: token } = await supabase.rpc("verify_client_login", {
    p_event_code: eventCode,
    p_password: password,
  });

  if (!token) {
    redirect(`/portal?error=${encodeURIComponent("Ongeldig Event ID of wachtwoord.")}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(`client_token_${token}`, "1", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  redirect(`/share/${token}`);
}
