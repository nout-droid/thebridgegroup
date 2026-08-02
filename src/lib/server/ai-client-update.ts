import "server-only";

export interface ActivityEntry {
  categoryLabel: string;
  actorLabel: string;
  description: string;
}

// Geen SDK-dependency — zelfde lichtgewicht fetch-aanpak als de DeepL-integratie
// (src/lib/server/translate.ts): inert zonder key, zodat de app zonder ANTHROPIC_API_KEY
// gewoon blijft werken.
export async function draftClientUpdateEmail(
  projectName: string,
  entries: ActivityEntry[]
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || entries.length === 0) return null;

  const bullets = entries.map((e) => `- [${e.categoryLabel}] ${e.actorLabel}: ${e.description}`).join("\n");
  const prompt =
    `Je bent een productieassistent bij een AV-productiebedrijf. Schrijf een korte, vriendelijke ` +
    `status-update e-mail (Nederlands, max 150 woorden) voor de klant van event "${projectName}", ` +
    `op basis van deze recente activiteit:\n\n${bullets}\n\n` +
    `Geen aanhef of afsluiting nodig — alleen de kern van de update, in lopende tekst of korte bullets.`;

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
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
      cache: "no-store",
    });
    if (!response.ok) return null;

    const data = await response.json();
    const text = data?.content?.[0]?.text;
    return typeof text === "string" ? text.trim() : null;
  } catch {
    return null;
  }
}
