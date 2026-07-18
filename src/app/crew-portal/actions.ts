"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function crewLogin(formData: FormData) {
  const eventCode = String(formData.get("event_code") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const division = String(formData.get("division") ?? "").trim();

  if (!eventCode || !password) {
    redirect(`/crew-portal?error=${encodeURIComponent("Vul een Event ID en wachtwoord in.")}`);
  }

  const supabase = await createClient();
  const { data: token } = await supabase.rpc("verify_crew_login", {
    p_event_code: eventCode,
    p_password: password,
  });

  if (!token) {
    redirect(`/crew-portal?error=${encodeURIComponent("Ongeldig Event ID of wachtwoord.")}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(`crew_token_${token}`, "1", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  redirect(`/crew/${token}${division ? `?division=${encodeURIComponent(division)}` : ""}`);
}
