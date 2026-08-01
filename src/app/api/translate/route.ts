import { NextResponse, type NextRequest } from "next/server";
import {
  TRANSLATION_OVERRIDES,
  DEEPL_IGNORE_TAG,
  wrapAmbiguousWords,
  unwrapAmbiguousWords,
} from "@/lib/translation-overrides";

export async function POST(request: NextRequest) {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "DEEPL_API_KEY is niet ingesteld." }, { status: 501 });
  }

  const body = await request.json().catch(() => null);
  const texts = Array.isArray(body?.texts) ? body.texts.filter((t: unknown) => typeof t === "string") : [];
  if (!texts.length) {
    return NextResponse.json({ translations: [] });
  }

  const toTranslate = texts.filter((text: string) => !(text in TRANSLATION_OVERRIDES));

  let translations: string[] = [];
  if (toTranslate.length) {
    const baseUrl = apiKey.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";

    const response = await fetch(`${baseUrl}/v2/translate`, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: toTranslate.map(wrapAmbiguousWords),
        target_lang: "EN",
        tag_handling: "xml",
        ignore_tags: [DEEPL_IGNORE_TAG],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Vertalen mislukt (${response.status})` }, { status: 502 });
    }

    const data = await response.json();
    translations = (data.translations ?? []).map((item: { text: string }) => unwrapAmbiguousWords(item.text));
  }

  const translationByText = new Map(toTranslate.map((text: string, i: number) => [text, translations[i]]));
  const result = texts.map((text: string) => translationByText.get(text) ?? TRANSLATION_OVERRIDES[text]);

  return NextResponse.json({ translations: result });
}
