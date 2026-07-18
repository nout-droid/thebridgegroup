// Vaste NL/EN-copy van de "Aanvraag checklist", overgenomen uit Nouts eigen goedgekeurde
// Drive-documenten ("Aanvraag checklist (PDF).pdf" / "Request checklist (ENG).pdf").
// Alleen de ingevulde antwoorden per sectie gaan naar de database — titels en hulptekst
// staan hier statisch, net als src/lib/rider-defaults.ts.

export interface IntakeChecklistSection {
  key: string;
  title_nl: string;
  title_en: string;
  guidance_nl: string[];
  guidance_en: string[];
}

export const INTAKE_CHECKLIST_INTRO_NL =
  "Bedankt dat jullie ons betrekken bij jullie evenement! Supertof dat wij mogen meedenken over de technische productie en het ontwerp. Ons doel is simpel: samen met jullie een evenement neerzetten dat technisch strak, visueel indrukwekkend én logisch georganiseerd is. Hoe beter we jullie wensen, de locatie en de doelstellingen begrijpen, hoe slimmer we kunnen ontwerpen en hoe efficiënter we met het budget kunnen omgaan. Gebruik deze handleiding als checklist bij jullie aanvraag. Hoe completer de informatie, hoe sneller wij met een passend voorstel, ontwerp en open begroting kunnen komen. Uiteraard is het geen enkel probleem als jullie bepaalde informatie nog niet hebben of kunnen delen.";

export const INTAKE_CHECKLIST_INTRO_EN =
  "Thank you for involving us in your event! We're excited to think along with you on the technical production and overall design. Our goal is simple: together we want to create an event that is technically solid, visually impressive, and logically organized. The better we understand your wishes, the venue, and the objectives, the smarter we can design and the more efficiently we can work with the budget. Use this guide as a checklist for your request. The more complete the information, the faster we can come back with a suitable proposal, design, and open-book budget. Of course, it's absolutely no problem if you don't have certain information yet or can't share it.";

export const INTAKE_CHECKLIST_SECTIONS: IntakeChecklistSection[] = [
  {
    key: "basisinformatie",
    title_nl: "1. Basisinformatie evenement",
    title_en: "1. Basic event information",
    guidance_nl: [
      "Naam & korte beschrijving van het evenement",
      "Wat voor evenement is het, wat gebeurt er globaal, voor wie?",
      "Verwacht aantal gasten en doelgroep (medewerkers, klanten, publiek, VIP, etc.)",
      "Type evenement (bijv. corporate congres, personeelsfeest, festival, concert, productlaunch, awardshow, etc.)",
      "Doel / boodschap: wat moeten gasten na afloop vooral gevoeld, gezien of meegenomen hebben? Eén kernzin helpt: “Na dit evenement moeten gasten…”",
    ],
    guidance_en: [
      "Name & short description of the event",
      "What kind of event is it, what will roughly happen, and for whom?",
      "Expected number of guests and target group (staff, clients, public, VIP, etc.)",
      "Type of event (e.g. corporate conference, staff party, festival, concert, product launch, award show, etc.)",
      "Goal / key message: what should guests especially feel, see, or take away afterwards? One core sentence helps: “After this event, guests should…”",
    ],
  },
  {
    key: "eindopdrachtgever",
    title_nl: "2. Eindopdrachtgever & context",
    title_en: "2. End client & context",
    guidance_nl: [
      "Naam eindopdrachtgever, type bedrijf/sector en website",
      "Korte beschrijving van het merk: kernwaarden, tone of voice, wat past wél / juist níet",
      "Moeten bepaalde merken/producten zichtbaar worden geïntegreerd in het decor?",
      "Zijn er gevoeligheden (exclusiviteit, concurrenten, politieke/maatschappelijke thema's) waarmee we rekening moeten houden?",
    ],
    guidance_en: [
      "Name of the end client, type of company/sector, and website",
      "Short description of the brand: core values, tone of voice, what does and doesn't fit",
      "Do specific brands/products need to be visibly integrated into the set or decor?",
      "Are there sensitivities (exclusivity, competitors, political/social topics) we should take into account?",
    ],
  },
  {
    key: "tijdschema",
    title_nl: "3. Tijdschema & deadlines",
    title_en: "3. Timeline & deadlines",
    guidance_nl: [
      "Opbouwdatum(s) + tijden (vanaf wanneer toegang tot zaal/locatie?)",
      "Showdatum(s) + tijden (inloop, programma, eindtijd)",
      "Afbouwdatum(s) + tijden (tot hoe laat mag er gewerkt worden?)",
    ],
    guidance_en: [
      "Build-up date(s) + times (from when do we have access to the room/venue?)",
      "Show date(s) + times (doors open, program, end time)",
      "Breakdown date(s) + times (until what time is work allowed?)",
    ],
  },
  {
    key: "locatie",
    title_nl: "4. Locatie, zaal & site visit",
    title_en: "4. Venue, room & site visit",
    guidance_nl: [
      "Locatiegegevens: naam, adres, contactpersoon, contactgegevens",
      "Indien beschikbaar: foto's van de locatie (zaal, foyer/entree, balkon, buitenkant van het pand)",
      "Is het mogelijk om een site visit te plannen? Zo ja: geef een paar mogelijke data/tijdstippen aan",
      "Vloerplan: is er een vloerplan gemaakt? Zo ja, graag bijvoegen (DWG / PDF)",
      "DWG / maatvoering zaal: is er een DWG-tekening beschikbaar? Indien niet, graag bruikbare lengte – breedte – hoogte van de zaal (hoogte tot riggingpunt gemeten)",
      "Riggingmogelijkheden: is er rigging mogelijk, hoeveel mag er in het dak hangen en hoeveel gewicht per riggingpunt? Riggingplot/load-limieten toevoegen indien beschikbaar",
    ],
    guidance_en: [
      "Venue details: name, address, contact person, contact details",
      "If available: photos of the venue (room, foyer/entrance, balcony, exterior of the building)",
      "Is it possible to schedule a site visit? If yes: suggest a few possible dates/times",
      "Floor plan: is there a floor plan? If so, please attach (DWG / PDF)",
      "DWG / room dimensions: is a DWG drawing available? If not, we'd like usable length – width – height (height measured up to the rigging point)",
      "Rigging options: is rigging possible, how much can be hung in the roof and what's the max load per rigging point? Add a rigging plot / load limits if available",
    ],
  },
  {
    key: "podium",
    title_nl: "5. Podium, setting & programma",
    title_en: "5. Stage, setup & program",
    guidance_nl: [
      "Is er een podium noodzakelijk? Zo ja: gewenste afmeting, hoogte en positie in de zaal",
      "Zaalopstelling: theater, school, diner, staand, mix?",
      "Globale programmablokken: sprekers, panels, band/DJ, awards, video's, Q&A, etc.",
      "Talen & ondersteuning: meertaligheid, tolken, vertaalcabines, ondertiteling nodig?",
    ],
    guidance_en: [
      "Is a stage required? If yes: desired size, height, and position in the room",
      "Room setup: theatre, classroom, dinner, standing, mixed?",
      "Global program blocks: speakers, panels, band/DJ, awards, videos, Q&A, etc.",
      "Languages & support: is multilingual support needed (interpreters, translation booths, subtitles)?",
    ],
  },
  {
    key: "concept",
    title_nl: "6. Concept, styling & inspiratie",
    title_en: "6. Concept, styling & inspiration",
    guidance_nl: [
      "Kernboodschap / thema van het evenement",
      "Styling: kleurpalet, materialen, thematiek, dresscode – wat wordt verder doorgevoerd?",
      "Inspiratie: is er een inspiratieboek gedeeld? Zijn er specifieke designwensen? Voeg eventueel foto's/beelden toe",
      "Eerdere edities: foto's/plattegronden van vorige jaren, indien relevant",
    ],
    guidance_en: [
      "Core message / theme of the event",
      "Styling: colour palette, materials, theme, dress code – what is being carried through?",
      "Inspiration: has an inspiration deck/book been shared? Are there specific design wishes? Feel free to add photos/images",
      "Previous editions: photos/floor plans from previous years, if relevant",
    ],
  },
  {
    key: "techniek",
    title_nl: "7. Techniek & budget",
    title_en: "7. Technical setup & budget",
    guidance_nl: [
      "Techniekbudget: indicatie of bandbreedte (bijv. € XX–XX k)",
      "Speciale wensen: projectie/LED-schermen, special effects (CO₂, confetti, vuurwerk*, lasers, hazers/fog, etc.), camera-registratie/streaming/opname",
      "Zijn er technische elementen die zeker níet gewenst zijn?",
      "Bestaande materialen van locatie/opdrachtgever die gebruikt moeten worden?",
      "*Afhankelijk van vergunningen en locatievoorwaarden",
    ],
    guidance_en: [
      "Technical budget: indication or range (e.g. €XX–XXk)",
      "Special wishes: projection/LED screens, special effects (CO₂, confetti, fireworks*, lasers, hazers/fog, etc.), camera registration/streaming/recording",
      "Are there technical elements that are definitely not desired?",
      "Existing equipment from the venue/client that must be used?",
      "*Depending on permits and venue conditions",
    ],
  },
  {
    key: "stroom",
    title_nl: "8. Stroom & logistiek",
    title_en: "8. Power & logistics",
    guidance_nl: [
      "Beschikbare (kracht)stroom: welke vrije aansluitingen zijn er (bijv. 3x63A, 3x32A) en waar zitten deze?",
      "Laad- en losvoorzieningen: hoe is de laad/los-situatie? Foto's graag toevoegen",
      "Interne logistiek: moet materiaal met liften naar een andere etage (afmetingen/draagvermogen)? Trappen, bochten, lage doorgangen?",
      "Locatieregels: geluidslimiet, werktijden, verplichte partners (preferred suppliers), veiligheidsregels",
      "Is er machinerie voorzien? (hoogwerkers, heftrucks, etc.)",
      "Is er crew catering voorzien? (lunch, diner, koffie/thee/fris)",
      "Zijn er eventuele hotelkamers beschikbaar (indien noodzakelijk)?",
    ],
    guidance_en: [
      "Available (three-phase) power: which free power connections are available (e.g. 3x63A, 3x32A) and where?",
      "Loading and unloading: what does the situation look like? Please include photos",
      "Internal logistics: does equipment need to go via lifts to another floor (dimensions/load capacity)? Stairs, tight corners, low doorways?",
      "Venue rules: sound limits, working hours, mandatory partners (preferred suppliers), safety rules",
      "Machinery: is any machinery provided? (boom lifts, forklifts, etc.)",
      "Crew catering: is crew catering provided? (lunch, dinner, coffee/tea/soft drinks)",
      "Hotel: are hotel rooms available (if necessary)?",
    ],
  },
  {
    key: "contact",
    title_nl: "9. Contact & besluitvorming",
    title_en: "9. Contacts & decision-making",
    guidance_nl: [
      "Hoofdcontactpersoon voor inhoud & productie (naam, telefoon, e-mail)",
      "Hoofdcontact op showdagen (indien anders)",
      "Hoe verloopt de besluitvorming? Wie beslist over budget en ontwerp? Moet het voorstel langs meerdere lagen/afdelingen?",
    ],
    guidance_en: [
      "Main contact for content & production (name, phone, e-mail)",
      "Main contact on show days (if different)",
      "Decision-making process: how are decisions made? Who decides on budget and design? Does the proposal need approval from multiple layers/departments?",
    ],
  },
];
