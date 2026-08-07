import "server-only";

export interface StorybookConcept {
  title: string;
  description: string;
  keywords: string;
}

// Zelfde lichtgewicht fetch-aanpak als draftClientUpdateEmail (src/lib/server/
// ai-client-update.ts) — geen SDK-dependency, inert zonder ANTHROPIC_API_KEY. Input is een
// vage sfeeromschrijving van de klant/producer ("stoer, industrieel, warm licht"); output is
// een startpunt voor een Storybook-hoofdstuk dat de producer nog aanpast, geen kant-en-klare
// tekst die blind wordt overgenomen.
export async function generateStorybookConcept(brief: string): Promise<StorybookConcept | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !brief.trim()) return null;

  const prompt =
    `Je bent een creative director bij een AV-productiebedrijf. Op basis van deze vage ` +
    `sfeeromschrijving van een klant/producer: "${brief.trim()}"\n\n` +
    `Geef een startpunt voor een hoofdstuk in een visueel "storybook" (moodboard-concept) voor het event. ` +
    `Antwoord ALLEEN met geldige JSON, exact dit format, geen andere tekst:\n` +
    `{"title": "korte hoofdstuktitel (max 5 woorden)", "description": "1-2 zinnen sfeerbeschrijving", "keywords": "5-8 zoektermen/stijlwoorden en een kleurenpalet, komma-gescheiden, bruikbaar om moodboard-afbeeldingen mee te zoeken"}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
      cache: "no-store",
    });
    if (!response.ok) return null;

    const data = await response.json();
    const text = data?.content?.[0]?.text;
    if (typeof text !== "string") return null;

    const parsed = JSON.parse(text);
    if (typeof parsed.title !== "string" || typeof parsed.description !== "string" || typeof parsed.keywords !== "string") {
      return null;
    }
    return { title: parsed.title, description: parsed.description, keywords: parsed.keywords };
  } catch {
    return null;
  }
}
