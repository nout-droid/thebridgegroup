import "server-only";
import type { AppLang } from "./lang";

// Server-side vertegenwoordiger van dezelfde DeepL-vertaling als /api/translate, maar dan
// direct aanroepbaar vanuit Server Components (geen client-side fetch/hook nodig — de
// interne producer-app wisselt van taal via een cookie + volledige paginanavigatie, niet
// reactief zoals de portalen). Simpele in-memory cache per servergeheugen zodat dezelfde
// vaste labels (nav, tabbladen, paginatitels) niet op elke request opnieuw naar DeepL
// hoeven, zonder een aparte databasetabel te introduceren voor iets dat prima verloren mag
// gaan bij een herstart.
const cache = new Map<string, string>();

async function translateBatch(texts: string[]): Promise<string[]> {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) return texts;

  const missing = texts.filter((text) => text && !cache.has(text));
  if (missing.length) {
    try {
      const baseUrl = apiKey.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
      const response = await fetch(`${baseUrl}/v2/translate`, {
        method: "POST",
        headers: {
          Authorization: `DeepL-Auth-Key ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: missing, target_lang: "EN" }),
        cache: "no-store",
      });
      if (response.ok) {
        const data = await response.json();
        const translations: string[] = (data.translations ?? []).map(
          (item: { text: string }) => item.text
        );
        missing.forEach((text, i) => cache.set(text, translations[i] ?? text));
      }
    } catch {
      // Vertalen mislukt (netwerk/key-probleem) — gewoon Nederlands tonen i.p.v. de pagina
      // te breken.
    }
  }

  return texts.map((text) => cache.get(text) ?? text);
}

/**
 * Geeft een t()-functie terug die synchroon vertaalde tekst oplevert, nadat alle benodigde
 * teksten al vooraf in bulk zijn opgehaald. Gebruik: const t = await createTranslator(lang,
 * [...alle statische labels + dynamische DB-tekst die deze pagina toont]).
 */
export async function createTranslator(
  lang: AppLang,
  texts: string[]
): Promise<(text: string) => string> {
  if (lang !== "en") return (text: string) => text;

  const unique = Array.from(new Set(texts.filter(Boolean)));
  const translated = await translateBatch(unique);
  const map = new Map(unique.map((text, i) => [text, translated[i]]));

  return (text: string) => map.get(text) ?? text;
}
