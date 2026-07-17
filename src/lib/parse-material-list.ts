import Papa from "papaparse";
import ExcelJS from "exceljs";

export interface ParsedMaterialListRow {
  description: string;
  quantity: number;
  unit: string;
}

const DESCRIPTION_ALIASES = ["omschrijving", "naam", "artikel", "description", "item", "materiaal", "name"];
const QUANTITY_ALIASES = ["aantal", "qty", "quantity", "hoeveelheid", "amount"];
const UNIT_ALIASES = ["eenheid", "unit"];

function parseNumber(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) return 1;
  const hasComma = trimmed.includes(",");
  const hasDot = trimmed.includes(".");
  let normalized = trimmed;
  if (hasComma && hasDot) {
    normalized = trimmed.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    normalized = trimmed.replace(",", ".");
  }
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function matchColumn(headers: string[], aliases: string[]): number {
  return headers.findIndex((h) => aliases.includes(h.trim().toLowerCase()));
}

function rowsFromTable(headers: string[], dataRows: string[][]): ParsedMaterialListRow[] {
  const descIdx = matchColumn(headers, DESCRIPTION_ALIASES);
  const qtyIdx = matchColumn(headers, QUANTITY_ALIASES);
  const unitIdx = matchColumn(headers, UNIT_ALIASES);

  const effectiveDescIdx = descIdx >= 0 ? descIdx : 0;
  const effectiveQtyIdx = qtyIdx >= 0 ? qtyIdx : headers.length > 1 ? 1 : -1;

  return dataRows
    .map((row) => ({
      description: (row[effectiveDescIdx] ?? "").trim(),
      quantity: effectiveQtyIdx >= 0 ? parseNumber(row[effectiveQtyIdx] ?? "1") : 1,
      unit: unitIdx >= 0 ? (row[unitIdx] ?? "").trim() : "",
    }))
    .filter((row) => row.description);
}

async function parseCsv(file: File): Promise<ParsedMaterialListRow[]> {
  const text = await file.text();
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
  const [headerRow, ...dataRows] = parsed.data;
  if (!headerRow) return [];
  return rowsFromTable(headerRow, dataRows);
}

async function parseExcel(file: File): Promise<ParsedMaterialListRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const table: string[][] = [];
  worksheet.eachRow((row) => {
    const values = row.values as unknown[];
    // ExcelJS rows are 1-indexed; values[0] is always empty.
    const cells = values.slice(1).map((v) => (v == null ? "" : String(v)));
    table.push(cells);
  });

  const [headerRow, ...dataRows] = table;
  if (!headerRow) return [];
  return rowsFromTable(headerRow, dataRows);
}

export async function parseMaterialListFile(file: File): Promise<ParsedMaterialListRow[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx")) {
    return parseExcel(file);
  }
  return parseCsv(file);
}
