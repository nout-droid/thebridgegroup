import { QUOTE_STATUS_LABELS } from "@/lib/types";

export const SUPPLIER_NAV_LABELS = ["Event rider", "Offertes", "Begroting", "Aanvragen"];

export const RIDER_VIEW_LABELS = [
  "Event rider",
  "Er staat nog geen project voor je klaar. Zodra er een offerteverzoek voor je is aangemaakt verschijnt het project hier.",
  "Er is nog geen rider beschikbaar voor dit project.",
  "Rider — projectbreed",
  "Rider",
];

export const OFFERTES_DASHBOARD_LABELS = [
  "Jouw offertes",
  "Er staan nog geen offerteverzoeken voor je klaar.",
  "Upload één offerte-PDF voor alle categorieën hieronder tegelijk — we splitsen de kosten er zelf uit. Bekijk je prijsopgave onder Begroting, en alle technische info en tekeningen onder Event rider.",
  "Al verwerkte offerte-documenten",
  "Geüpload, wacht op verwerking door The Bridge",
  "Offerte-PDF uploaden",
  "Bekijken",
  "(door The Bridge)",
  "bevestigd",
  "ter controle",
  ...Object.values(QUOTE_STATUS_LABELS),
];

export const BEGROTING_VIEW_LABELS = [
  "Begroting",
  "Jouw eigen prijsopgave per categorie, inclusief regels waar bekend.",
  "Er staat nog geen offerteverzoek voor je klaar.",
  "Voor dit project heb je nog geen offerte ingediend.",
  "Aantal",
  "Prijs per stuk",
  "Totaal",
  "Totaal deze categorie",
  "Totaal project",
  "Opbouw vanaf",
  "Afbouw vanaf",
  ...Object.values(QUOTE_STATUS_LABELS),
];
