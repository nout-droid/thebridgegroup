import { extractText, getDocumentProxy } from "unpdf";

export interface ParsedQuoteLine {
  raw_text: string;
  price: number;
}

// Regel eindigt op een bedrag, bv. "Mac Quantum Profile  4x  340,00" of "Transport  250.00 EUR".
const LINE_WITH_PRICE_RE = /^(.+?)[\s:€]*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))\s*(?:EUR|€)?$/i;

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
  }
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : 0;
}

export async function parseQuotePdfFile(file: File): Promise<ParsedQuoteLine[]> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocumentProxy(buffer);
  const { text } = await extractText(pdf, { mergePages: true });

  const lines: ParsedQuoteLine[] = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.length < 4) continue;

    const match = line.match(LINE_WITH_PRICE_RE);
    if (!match) continue;

    const description = match[1].trim().replace(/[\s.:,-]+$/, "");
    if (!description) continue;

    const price = parsePrice(match[2]);
    if (price <= 0) continue;

    lines.push({ raw_text: description, price });
  }

  return lines;
}
