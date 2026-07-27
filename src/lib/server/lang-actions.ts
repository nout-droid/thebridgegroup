"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LANG_COOKIE, type AppLang } from "./lang";

export async function setAppLang(lang: AppLang) {
  const cookieStore = await cookies();
  cookieStore.set(LANG_COOKIE, lang, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  // Alle Server Components (Nav, huidige pagina, etc.) lezen de cookie opnieuw uit bij
  // hernieuwde render — geen expliciete redirect nodig, de huidige route ververst gewoon.
  revalidatePath("/", "layout");
}
