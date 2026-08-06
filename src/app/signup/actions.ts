"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE_NL } from "@/lib/server/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";

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

  const turnstileOk = await verifyTurnstileToken(String(formData.get("cf-turnstile-response") ?? ""), ip);
  if (!turnstileOk) {
    redirect(`/signup?error=${encodeURIComponent("Verificatie mislukt. Probeer het opnieuw.")}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error || !data.user) {
    redirect(`/signup?error=${encodeURIComponent(error?.message ?? "Aanmelden mislukt.")}`);
  }

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .insert({
      owner_user_id: data.user.id,
      name: companyName,
      plan: "trial",
      subscription_status: "trialing",
    })
    .select("id")
    .single();

  // Elke aanmelding wordt automatisch een lead in de platform-backoffice (/admin) — zo ziet
  // Nout als producteigenaar wie de tool test, zonder dat hij dit los hoeft bij te houden.
  if (org) {
    await admin.from("platform_leads").insert({ organization_id: org.id, status: "new" });
  }

  if (data.session) {
    redirect("/projects");
  }

  redirect("/signup?message=" + encodeURIComponent("Check je e-mail om je account te bevestigen."));
}
