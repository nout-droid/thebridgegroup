"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE_NL } from "@/lib/server/rate-limit";

const ATTENDEE_PHOTOS_BUCKET = "attendee-photos";

function attendeeCookieName(token: string) {
  return `attendee_id_${token}`;
}

async function setAttendeeCookie(token: string, attendeeId: string) {
  const cookieStore = await cookies();
  cookieStore.set(attendeeCookieName(token), attendeeId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

// Zelfde autorisatiepatroon als isAuthorizedGuest (src/app/guest/[token]/actions.ts): geen
// Supabase-sessie voor de attendee, dus de attendee_id_<token>-cookie (gezet bij registreren
// of inloggen) is het bewijs van toegang. De cookienaam bevat het projecttoken, dus een
// attendee-cookie van event A wordt nooit per ongeluk gebruikt op de /attendee/[tokenB]-pagina
// van een ander event.
async function isAuthorizedAttendee(token: string): Promise<{ attendeeId: string; projectId: string } | null> {
  const cookieStore = await cookies();
  const attendeeId = cookieStore.get(attendeeCookieName(token))?.value;
  if (!attendeeId) return null;

  const admin = createAdminClient();
  const { data: attendee } = await admin
    .from("event_attendees")
    .select("id, project_id, projects!inner(share_token)")
    .eq("id", attendeeId)
    .maybeSingle<{ id: string; project_id: string; projects: { share_token: string } }>();

  if (!attendee || attendee.projects.share_token !== token) return null;
  return { attendeeId: attendee.id, projectId: attendee.project_id };
}

export async function registerAttendee(
  token: string,
  formData: FormData
): Promise<{ ok: true; accessCode: string } | { ok: false; error: string }> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();

  if (!name) return { ok: false, error: "Vul je naam in." };

  const ip = await getClientIp();
  const { blocked } = await checkRateLimit("attendee_register", `${ip}:${token}`, {
    maxAttempts: 20,
    windowMinutes: 15,
  });
  if (blocked) return { ok: false, error: RATE_LIMIT_MESSAGE_NL };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("register_attendee", {
    p_project_token: token,
    p_name: name,
    p_email: email || null,
    p_company: company || null,
    p_title: title || null,
  });

  if (error || !data?.attendee_id) {
    return { ok: false, error: "Registreren is niet gelukt. Vraag de organisator of de event app aanstaat." };
  }

  await setAttendeeCookie(token, data.attendee_id as string);
  return { ok: true, accessCode: data.access_code as string };
}

export async function loginAttendee(
  token: string,
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = String(formData.get("email") ?? "").trim();
  const accessCode = String(formData.get("access_code") ?? "").trim();

  if (!email || !accessCode) return { ok: false, error: "Vul je e-mailadres en toegangscode in." };

  const ip = await getClientIp();
  const { blocked } = await checkRateLimit("attendee_login", `${ip}:${email.toLowerCase()}`, {
    maxAttempts: 10,
    windowMinutes: 15,
  });
  if (blocked) return { ok: false, error: RATE_LIMIT_MESSAGE_NL };

  const supabase = await createClient();
  const { data: attendeeId, error } = await supabase.rpc("verify_attendee_login", {
    p_project_token: token,
    p_email: email,
    p_access_code: accessCode,
  });

  if (error || !attendeeId) {
    return { ok: false, error: "Ongeldig e-mailadres of toegangscode." };
  }

  await setAttendeeCookie(token, attendeeId as string);
  return { ok: true };
}

export async function logoutAttendee(token: string) {
  const cookieStore = await cookies();
  cookieStore.delete(attendeeCookieName(token));
}

export async function uploadAttendeePhoto(
  token: string,
  formData: FormData
): Promise<{ ok: true; photoUrl: string } | { ok: false; error: string }> {
  const authorized = await isAuthorizedAttendee(token);
  if (!authorized) return { ok: false, error: "Niet ingelogd." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Kies eerst een foto." };
  if (!file.type.startsWith("image/")) return { ok: false, error: "Kies een afbeeldingsbestand." };

  const admin = createAdminClient();
  const path = `${authorized.projectId}/${authorized.attendeeId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await admin.storage
    .from(ATTENDEE_PHOTOS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadError) return { ok: false, error: "Uploaden is niet gelukt." };

  const { data: publicUrlData } = admin.storage.from(ATTENDEE_PHOTOS_BUCKET).getPublicUrl(path);
  const photoUrl = publicUrlData.publicUrl;

  await admin.from("event_attendees").update({ photo_url: photoUrl }).eq("id", authorized.attendeeId);

  return { ok: true, photoUrl };
}
