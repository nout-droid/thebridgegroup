export interface DefaultRiderSection {
  title: string;
  editable_by_client: boolean;
  content?: string;
  // Secties die per podium/area verschillen (bv. afmetingen, rig per stage) i.p.v. projectbreed
  // (bv. contactpersonen, veiligheid, weer). Zie ensureStageRiderSections in ensure-rider.ts.
  stageSpecific?: boolean;
}

// Gebaseerd op het officiële "Festival Stage Rider" sjabloon van The Bridge AV Group.
// De labels hieronder dienen als invulsjabloon in het vrije tekstveld van een onderdeel.
export const DEFAULT_RIDER_SECTIONS: DefaultRiderSection[] = [
  {
    title: "Event informatie",
    editable_by_client: false,
    content:
      "Event naam: \n" +
      "Locatie / venue: \n" +
      "Datum(s) event: \n" +
      "Aantal areas / stages: \n" +
      "Documentversie: v1.0\n" +
      "Datum uitgifte: ",
  },
  {
    title: "Contactpersoon The Bridge AV Group",
    editable_by_client: false,
    content:
      "Naam: Nout van Bruggen\n" +
      "Functie: Production Manager\n" +
      "Telefoon: +31 6 83 996 388\n" +
      "E-mail: nout@thebridgeavgroup.com",
  },
  {
    title: "Contactpersoon artiest / management",
    editable_by_client: true,
    content: "Naam: \nArtiest(en): \nTelefoon: \nE-mail: ",
  },
  {
    title: "Stage informatie",
    editable_by_client: false,
    stageSpecific: true,
    content:
      "Stage dimensions (W x D x H): \n" +
      "Trim / rigging height: \n" +
      "Stage load capacity: \n" +
      "Distance FOH – front of stage: \n" +
      "Power available at stage: \n" +
      "Weather protection: \n" +
      "Load-in access & time: \n" +
      "Other remarks: ",
  },
  {
    title: "Logistiek",
    editable_by_client: false,
    content:
      "Laad- / losadres: \n" +
      "Aanrijroute (vracht)verkeer: \n" +
      "Parkeren crew & techniek: \n" +
      "Loopafstand parkeren → podium: \n" +
      "Losplek → podium (afstand/route): \n" +
      "Benodigd laad-/losmaterieel: \n" +
      "Load-in datum & tijd: \n" +
      "Soundcheck / doorloop: \n" +
      "Load-out datum & tijd: \n" +
      "Contactpersoon logistiek ter plaatse: \n" +
      "Bijzonderheden (trappen, hoogteverschil, security check): ",
  },
  {
    title: "Stroom & communicatie",
    editable_by_client: false,
    content:
      "Hoofdvoeding stage: \n" +
      "Back-up / generator: \n" +
      "Aarding: \n" +
      "Intercom kanalen: \n" +
      "Portofoon / walkie kanalen: \n" +
      "Wifi / internet op locatie: \n" +
      "Contactpersoon power/comms: ",
  },
  {
    title: "Hospitality",
    editable_by_client: true,
    content:
      "Kleedkamers (aantal / locatie): \n" +
      "Catering crew & artiest: \n" +
      "Aantal crew-/artiestenpassen: \n" +
      "Backstage voorzieningen: \n" +
      "Contactpersoon hospitality: ",
  },
  {
    title: "Veiligheid",
    editable_by_client: false,
    content:
      "Contactpersoon site safety / BHV: \n" +
      "Locatie EHBO: \n" +
      "Vluchtroutes / nooduitgangen: \n" +
      "Locatie brandblusmiddelen: \n" +
      "Noodnummer ter plaatse: ",
  },
  {
    title: "Weer & noodplan",
    editable_by_client: false,
    content:
      "Windlimiet rigging / truss: \n" +
      "Protocol bij onweer / storm: \n" +
      "Verantwoordelijke stop-beslissing: \n" +
      "Schuillocatie crew & artiest: ",
  },
  {
    title: "Stage plot / technische tekening",
    editable_by_client: false,
    stageSpecific: true,
    content:
      "Bijlage toegevoegd: \nVersie / datum tekening: \nContactpersoon technisch ontwerp: ",
  },
  { title: "Audio", editable_by_client: false, stageSpecific: true },
  { title: "Light", editable_by_client: false, stageSpecific: true },
  { title: "Video", editable_by_client: false, stageSpecific: true },
  { title: "Rigging", editable_by_client: false, stageSpecific: true },
  { title: "Special FX", editable_by_client: false, stageSpecific: true },
  { title: "Decor", editable_by_client: false, stageSpecific: true },
];
