"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE_NL } from "@/lib/server/rate-limit";

export async function loginClientAccount(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(`/client-portal?error=${encodeURIComponent("Vul je e-mailadres en wachtwoord in.")}`);
  }

  const ip = await getClientIp();
  const { blocked } = await checkRateLimit("client_account_login", `${ip}:${email.toLowerCase()}`, {
    maxAttempts: 10,
    windowMinutes: 15,
  });
  if (blocked) redirect(`/client-portal?error=${encodeURIComponent(RATE_LIMIT_MESSAGE_NL)}`);

  const supabase = await createClient();
  const { data: accountId } = await supabase.rpc("login_client_account", {
    p_email: email,
    p_password: password,
  });

  if (!accountId) {
    redirect(`/client-portal?error=${encodeURIComponent("Ongeldig e-mailadres of wachtwoord.")}`);
  }

  const cookieStore = await cookies();
  cookieStore.set("client_account_id", accountId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  redirect("/client-portal/projects");
}

export async function logoutClientAccount() {
  const cookieStore = await cookies();
  cookieStore.delete("client_account_id");
  redirect("/client-portal");
}
