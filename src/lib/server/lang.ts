import "server-only";
import { cookies } from "next/headers";

export type AppLang = "nl" | "en";

const LANG_COOKIE = "app_lang";

// Voorkeurstaal voor het interne (Server Component-based) deel van de app — apart van de
// client-side useTranslator die de portalen gebruiken, want deze pagina's kunnen niet
// reactief client-side hervertalen zonder alles naar client components om te bouwen.
// Een cookie + volledige page-navigatie bij het wisselen van taal is hier het simpelste,
// robuustste patroon.
export async function getAppLang(): Promise<AppLang> {
  const cookieStore = await cookies();
  return cookieStore.get(LANG_COOKIE)?.value === "en" ? "en" : "nl";
}

export { LANG_COOKIE };
