"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE_NL } from "@/lib/server/rate-limit";

export async function signUp(formData: FormData) {
  const companyName = String(formData.get("company_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!companyName || !email || !password) {
    redirect(`/signup?error=${encodeURIComponent("Vul alle velden in.")}`);
  }

  const ip = await getClientIp();
  const { blocked } = await checkRateLimit("signup", ip, { maxAttempts: 8, windowMinutes: 60 });
  if (blocked) redirect(`/signup?error=${encodeURIComponent(RATE_LIMIT_MESSAGE_NL)}`);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error || !data.user) {
    redirect(`/signup?error=${encodeURIComponent(error?.message ?? "Aanmelden mislukt.")}`);
  }

  const admin = createAdminClient();
  await admin.from("organizations").insert({
    owner_user_id: data.user.id,
    name: companyName,
    plan: "trial",
    subscription_status: "trialing",
  });

  if (data.session) {
    redirect("/projects");
  }

  redirect("/signup?message=" + encodeURIComponent("Check je e-mail om je account te bevestigen."));
}
