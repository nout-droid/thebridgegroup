// DeepL vertaalt het Nederlandse "stage" (podium/locatie, AV-jargon) standaard als het
// Engelse "internship" (stage = werkervaringsplek) — de veelvoorkomende NL betekenis wint.
// Voor deze vaste labels forceren we daarom de juiste vertaling i.p.v. DeepL te vertrouwen.
// Wordt gebruikt door zowel de server-side translator (interne producer-app) als de
// client-side /api/translate route (portalen), zodat beide paden consistent zijn.
export const TRANSLATION_OVERRIDES: Record<string, string> = {
  Stage: "Stage",
  Stages: "Stages",
  "Stage verwijderen": "Remove stage",
  "Stage toevoegen": "Add stage",
  "Nieuwe stage, bv. Hoofdpodium": "New stage, e.g. Main Stage",
  "Nog geen stages. Voeg een stage toe als het event meerdere podia/locaties heeft die je apart wilt begroten.":
    "No stages yet. Add a stage if the event has multiple stages/locations you want to budget separately.",
  "Bijvoorbeeld Show, Audio, Video, Licht, Stage.": "For example Show, Audio, Video, Light, Stage.",
  "bv. Show, Stage": "e.g. Show, Stage",
  "bv. Stage links": "e.g. Stage left",

  // Zelfde probleem met het Nederlandse "vlucht" (luchtvaart) — DeepL leest het los, of in
  // "vlucht nodig", als de vluchtelingen-/wegvluchten-betekenis en vertaalt naar "escape".
  Vlucht: "Flight",
  "Vlucht nodig": "Flight needed",

  // "Actie" los (zonder verdere context, zoals een tabelkolomkop) wordt door DeepL soms als
  // "promotion/deal" gelezen (reclame-actie) i.p.v. "action" (handeling).
  Actie: "Action",

  // Los "Bio" (spreker-biografie veldlabel) wordt door DeepL zonder context vertaald als
  // "Was" (bio -> "was" in de zin van duurzaam/organisch wordt fout gelezen). Forceer de
  // juiste vertaling i.p.v. het Nederlandse label te wijzigen.
  Bio: "Biography",
};
