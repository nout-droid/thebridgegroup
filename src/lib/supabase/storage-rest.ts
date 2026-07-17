import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// The @supabase/supabase-js Storage sub-client wraps File/Blob uploads in a
// multipart FormData body. Against this project's Supabase instance that
// request is consistently rejected by the bucket's RLS policy even though the
// exact same JWT succeeds via a plain fetch with a raw body — so storage
// reads/writes from server actions go through direct REST calls instead.
//
// Also avoid the `x-upsert` header entirely: setting it (even to overwrite a
// path that can't actually collide, since callers always use a timestamped
// path) trips the same RLS check. Every caller here uses a unique path per
// upload, so plain inserts are enough — there's nothing to overwrite.
async function accessToken(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<string | undefined> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token;
}

export async function uploadToStorage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  bucket: string,
  path: string,
  file: File
): Promise<boolean> {
  const token = await accessToken(supabase);
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": file.type || "application/octet-stream",
    },
    body: Buffer.from(await file.arrayBuffer()),
  });
  return res.ok;
}

export async function removeFromStorage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  bucket: string,
  paths: string[]
): Promise<boolean> {
  if (paths.length === 0) return true;
  const token = await accessToken(supabase);
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}`, {
    method: "DELETE",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefixes: paths }),
  });
  return res.ok;
}

export function publicStorageUrl(bucket: string, path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
