import "server-only";

export interface PersonalTouchInput {
  contactName: string;
  companyName: string;
  birthday: string | null;
  familyNotes: string;
  preferences: string;
}

// Zelfde lichtgewicht fetch-aanpak als draftClientUpdateEmail (ai-client-update.ts) — inert
// zonder ANTHROPIC_API_KEY, geen SDK-dependency.
export async function suggestPersonalTouch(input: PersonalTouchInput): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (!input.birthday && !input.familyNotes.trim() && !input.preferences.trim()) return null;

  const facts = [
    input.birthday && `Verjaardag: ${input.birthday}`,
    input.familyNotes.trim() && `Gezin: ${input.familyNotes.trim()}`,
    input.preferences.trim() && `Voorkeuren: ${input.preferences.trim()}`,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt =
    `Je bent een sales-assistent bij een AV-productiebedrijf dat persoonlijke aandacht wil geven aan ` +
    `zakelijke contacten. Geef 2-3 korte, concrete suggesties (Nederlands) voor een persoonlijk gebaar ` +
    `richting ${input.contactName} van ${input.companyName}, op basis van deze informatie:\n\n${facts}\n\n` +
    `Denk aan dingen als een handgeschreven kaartje, een klein cadeau afgestemd op hun smaak, of een ` +
    `attentie bij een volgende afspraak. Kort en concreet, geen inleiding — alleen de suggesties als ` +
    `bullets.`;

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
    return typeof text === "string" ? text.trim() : null;
  } catch {
    return null;
  }
}
