"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE_NL } from "@/lib/server/rate-limit";

export async function supplierLogin(formData: FormData) {
  const portalCode = String(formData.get("portal_code") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!portalCode || !password) {
    redirect(`/supplier-portal?error=${encodeURIComponent("Vul een code en wachtwoord in.")}`);
  }

  const ip = await getClientIp();
  const { blocked } = await checkRateLimit("supplier_login", `${ip}:${portalCode.toLowerCase()}`, {
    maxAttempts: 10,
    windowMinutes: 15,
  });
  if (blocked) redirect(`/supplier-portal?error=${encodeURIComponent(RATE_LIMIT_MESSAGE_NL)}`);

  const supabase = await createClient();
  const { data: supplierId } = await supabase.rpc("verify_supplier_login", {
    p_portal_code: portalCode,
    p_password: password,
  });

  if (!supplierId) {
    redirect(`/supplier-portal?error=${encodeURIComponent("Ongeldige code of wachtwoord.")}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(`supplier_token_${supplierId}`, "1", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  redirect(`/supplier-portal/${supplierId}`);
}
