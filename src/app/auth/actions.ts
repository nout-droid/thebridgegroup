"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function getOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const protocol = h.get("x-forwarded-proto") ?? "https";
  return `${protocol}://${host}`;
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const origin = await getOrigin();

  if (email) {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/confirm?next=/auth/reset-password`,
    });
  }

  // Altijd dezelfde melding, ongeacht of het e-mailadres bestaat — voorkomt dat
  // je kunt aftasten welke e-mailadressen een account hebben.
  redirect(
    `/login/reset-password?message=${encodeURIComponent(
      "Als dit e-mailadres bekend is, ontvang je zo een link om je wachtwoord opnieuw in te stellen."
    )}`
  );
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (password.length < 6) {
    redirect(`/auth/reset-password?error=${encodeURIComponent("Wachtwoord moet minstens 6 tekens zijn.")}`);
  }
  if (password !== confirmPassword) {
    redirect(`/auth/reset-password?error=${encodeURIComponent("Wachtwoorden komen niet overeen.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/auth/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/login?message=${encodeURIComponent("Wachtwoord gewijzigd. Je kunt nu inloggen.")}`);
}
