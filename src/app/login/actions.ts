"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE_NL } from "@/lib/server/rate-limit";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const ip = await getClientIp();
  const { blocked } = await checkRateLimit("owner_login", `${ip}:${email.toLowerCase()}`, {
    maxAttempts: 10,
    windowMinutes: 15,
  });
  if (blocked) redirect(`/login?error=${encodeURIComponent(RATE_LIMIT_MESSAGE_NL)}`);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/projects");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
