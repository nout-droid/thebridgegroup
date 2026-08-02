import { extractText, getDocumentProxy } from "unpdf";

export interface ParsedQuoteLine {
  raw_text: string;
  price: number;
  heading: string | null;
}

interface ParsedPriceLine {
  raw_text: string;
  price: number;
}

// Regel eindigt op een bedrag zonder €-teken, bv. "Transport 250.00 EUR" — fallback voor
// offertes die geen €-teken gebruiken.
const LINE_WITH_PRICE_RE = /^(.+?)[\s:€]*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))\s*(?:EUR|€)?$/i;
const EURO_AMOUNT_RE = /€\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+)/g;
const NOISE_RE = /^(totaal|subtotaal|prijs\s+(excl|incl)\.?\s*btw|\d+%\s*btw|btw)\b/i;

function parsePrice(raw: string): number {
  const trimmed = raw.trim();
  const hasComma = trimmed.includes(",");
  const hasDot = trimmed.includes(".");
  let normalized = trimmed;
  if (hasComma && hasDot) {
    normalized = trimmed.lastIndexOf(",") > trimmed.lastIndexOf(".")
      ? trimmed.replace(/\./g, "").replace(",", ".")
      : trimmed.replace(/,/g, "");
  } else if (hasComma) {
    normalized = trimmed.replace(",", ".");
  } else if (hasDot) {
    // Losse punt: bij Europese notatie is dat een duizendtal-scheiding, geen decimaal,
    // als de punt gevolgd wordt door precies 3 cijfers (bv. "1.500" = 1500, niet 1,5).
    const parts = trimmed.split(".");
    if (parts.length > 1 && parts[parts.length - 1].length === 3) {
      normalized = trimmed.replace(/\./g, "");
    }
  }
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : 0;
}

// Sommige offertes (bv. Rent-All) hebben extra kolommen tussen omschrijving en bedrag,
// zoals "Periode" en "Staffel" (bv. "... [2 pieces]     1   1,05   €  262,50 ..."). Die losse
// getallen blijven anders aan de omschrijving plakken en breken de catalogus-matching.
function stripTrailingColumnNumbers(text: string): string {
  return text.replace(/(?:\s+\d+(?:[.,]\d+)?){1,2}$/, "").trim();
}

function parseLine(line: string): ParsedPriceLine | null {
  const euroMatches = [...line.matchAll(EURO_AMOUNT_RE)];

  if (euroMatches.length > 0) {
    const first = euroMatches[0];
    const last = euroMatches[euroMatches.length - 1];

    let description = line.slice(0, first.index).trim().replace(/[\s.:,-]+$/, "");
    description = stripTrailingColumnNumbers(description);
    const qtyMatch = description.match(/^(\d+)\s+(.+)$/);
    if (qtyMatch) {
      description = `${qtyMatch[1]}x ${qtyMatch[2].trim()}`;
    }
    if (!description || NOISE_RE.test(description)) return null;

    const price = parsePrice(last[1]);
    if (price <= 0) return null;

    return { raw_text: description, price };
  }

  // Fallback: geen €-teken, probeer het bedrag aan het eind van de regel te herkennen.
  const match = line.match(LINE_WITH_PRICE_RE);
  if (!match) return null;

  const description = stripTrailingColumnNumbers(match[1].trim().replace(/[\s.:,-]+$/, ""));
  if (!description || NOISE_RE.test(description)) return null;

  const price = parsePrice(match[2]);
  if (price <= 0) return null;

  return { raw_text: description, price };
}

// Paginakop/-voettekst (bv. bedrijfsadres + KvK-nummer) komt vaak letterlijk op elke
// pagina terug en kan aan het begin van de eerstvolgende regel blijven plakken als een
// pagina-einde geen newline oplevert. Zulke, op 3+ pagina's identieke regels, negeren we.
function findRepeatedBoilerplateLines(pages: string[]): Set<string> {
  const counts = new Map<string, number>();
  for (const page of pages) {
    const seenOnThisPage = new Set<string>();
    for (const rawLine of page.split("\n")) {
      const line = rawLine.trim();
      if (!line || seenOnThisPage.has(line)) continue;
      seenOnThisPage.add(line);
      counts.set(line, (counts.get(line) ?? 0) + 1);
    }
  }
  const repeated = new Set<string>();
  for (const [line, count] of counts) {
    if (count >= 3) repeated.add(line);
  }
  return repeated;
}

// Herkent een kop-regel (bv. "Sound", "Light", "Licht area 1") als: geen bedrag, en begint
// niet met een aantal-prefix zoals sub-componenten dat wel doen (bv. "2 L-Acoustics - SYVA
// Top"). Leveranciers groeperen zelf vaak per discipline of podium met zo'n kopregel — nuttig
// als hint om regels aan een podium te koppelen, ook als de kop zelf geen exacte match oplevert.
const HEADING_LEADING_QTY_RE = /^\d+\s+\S/;

function isHeadingCandidate(line: string): boolean {
  return line.length >= 2 && line.length <= 60 && !HEADING_LEADING_QTY_RE.test(line) && !NOISE_RE.test(line);
}

function normalizeDigits(line: string): string {
  return line.replace(/\d+/g, "#");
}

// Paginakop/-voettekst met een wisselend paginanummer erin (bv. "Opdrachtgever : ...
// pagina : 3 van 10") is op elke pagina net iets anders, dus findRepeatedBoilerplateLines
// (exacte match) vangt 'm niet. Zonder deze check wordt zo'n regel gezien als een (foute)
// kopregel en overschrijft die de echte sectiekop (bv. "Sound") voor alle volgende regels.
function findRepeatedHeadingNoisePatterns(pages: string[]): Set<string> {
  const counts = new Map<string, number>();
  for (const page of pages) {
    const seenOnThisPage = new Set<string>();
    for (const rawLine of page.split("\n")) {
      const line = rawLine.trim();
      if (!line || !isHeadingCandidate(line) || parseLine(line)) continue;
      const key = normalizeDigits(line);
      if (seenOnThisPage.has(key)) continue;
      seenOnThisPage.add(key);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const repeated = new Set<string>();
  for (const [key, count] of counts) {
    if (count >= 3) repeated.add(key);
  }
  return repeated;
}

export async function parseQuotePdfFile(file: File): Promise<ParsedQuoteLine[]> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocumentProxy(buffer);
  // mergePages:true levert voor sommige PDF's tekst zonder newlines op (elke pagina
  // wordt dan één aaneengesloten blob), waardoor regel-voor-regel parsen niets oplevert.
  // Per pagina apart extraheren behoudt de regel-structuur wél.
  const { text: pages } = await extractText(pdf, { mergePages: false });

  const boilerplate = findRepeatedBoilerplateLines(pages);
  const headingNoise = findRepeatedHeadingNoisePatterns(pages);
  const fullText = pages.join("\n");

  const lines: ParsedQuoteLine[] = [];
  let currentHeading: string | null = null;
  for (const rawLine of fullText.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.length < 4 || boilerplate.has(line)) continue;

    const parsed = parseLine(line);
    if (parsed) {
      lines.push({ ...parsed, heading: currentHeading });
    } else if (isHeadingCandidate(line) && !headingNoise.has(normalizeDigits(line))) {
      currentHeading = line.replace(/:$/, "").trim();
    }
  }

  return lines;
}
