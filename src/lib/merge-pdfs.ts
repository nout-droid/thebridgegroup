import "server-only";
import { PDFDocument } from "pdf-lib";

// Voegt losse, al gerenderde PDF-buffers samen tot één document — hergebruikt de
// bestaande per-sectie generatoren (rider, hotel, vluchten, draaiboek, etc.) i.p.v.
// hun opmaak te dupliceren.
export async function mergePdfBuffers(buffers: Buffer[]): Promise<Buffer> {
  const merged = await PDFDocument.create();

  for (const buffer of buffers) {
    const doc = await PDFDocument.load(buffer);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    for (const page of pages) merged.addPage(page);
  }

  const bytes = await merged.save();
  return Buffer.from(bytes);
}
