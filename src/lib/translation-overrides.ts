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
  "bv. Technical rider": "e.g. Technical rider",

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

// De TRANSLATION_OVERRIDES hierboven vangen alleen EXACTE hele-string matches af - dat werkt
// voor vaste UI-labels, maar niet voor vrije tekst die een producer zelf typt (rundown-
// notities, rider-tekst, klantverzoeken, crew-notities...) waar "stage" of "vlucht" gewoon
// ergens middenin een zin staat. DeepL vertaalt dat ingebedde woord dan nog steeds fout,
// override of niet. Generieke oplossing: DeepL's eigen ignore_tags-mechanisme (tag_handling:
// "xml") - het woord voor de aanroep in een <keep>-tag wikkelen, DeepL laat de inhoud van die
// tag dan gegarandeerd ongemoeid, en na vertaling strippen we de tags weer. Robuuster dan een
// eigen placeholder-truc, en de Engelse schrijfwijze is toch identiek aan de Nederlandse
// ("stage"/"vlucht"), dus de oorspronkelijke hoofdlettering blijft vanzelf behouden.
const PROTECTED_WORDS = ["stage", "vlucht"];
const PROTECTED_WORD_RE = new RegExp(`\\b(${PROTECTED_WORDS.join("|")})\\b`, "gi");
export const DEEPL_IGNORE_TAG = "keep";

export function wrapAmbiguousWords(text: string): string {
  return text.replace(PROTECTED_WORD_RE, (match) => `<${DEEPL_IGNORE_TAG}>${match}</${DEEPL_IGNORE_TAG}>`);
}

export function unwrapAmbiguousWords(text: string): string {
  return text.replace(new RegExp(`</?${DEEPL_IGNORE_TAG}>`, "g"), "");
}
