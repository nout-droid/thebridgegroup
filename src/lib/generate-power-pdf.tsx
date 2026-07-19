import "server-only";
import path from "node:path";
import fs from "node:fs";
import { Document, Page, Text, View, Image, Font, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

export interface PowerPdfEntry {
  stage_name: string | null;
  description: string;
  quantity: number;
  position: string;
  supplier_name: string | null;
  notes: string;
}

export interface PowerPdfData {
  projectName: string;
  generatedAt: Date;
  entries: PowerPdfEntry[];
}

const FONT_DIR = path.join(process.cwd(), "node_modules/@fontsource/poppins/files");
const LOGO_PATH = path.join(process.cwd(), "public/logo.png");

let fontsRegistered = false;
function registerFonts() {
  if (fontsRegistered) return;
  Font.register({
    family: "Poppins",
    fonts: [
      { src: path.join(FONT_DIR, "poppins-latin-400-normal.woff"), fontWeight: 400 },
      { src: path.join(FONT_DIR, "poppins-latin-600-normal.woff"), fontWeight: 600 },
      { src: path.join(FONT_DIR, "poppins-latin-700-normal.woff"), fontWeight: 700 },
    ],
  });
  fontsRegistered = true;
}

const PRIMARY_GREEN = "#7dff43";
const BRAND_BLUE = "#046bd2";

const styles = StyleSheet.create({
  page: { fontFamily: "Poppins", fontSize: 10, color: "#111", paddingBottom: 60 },
  header: {
    backgroundColor: "#000",
    paddingHorizontal: 40,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 26, height: 20 },
  brand: { fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5, color: PRIMARY_GREEN },
  headerMeta: { fontSize: 8, color: "#ffffffaa", marginTop: 3 },
  titleBlock: { paddingHorizontal: 40, paddingTop: 24, paddingBottom: 12 },
  eyebrow: { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: BRAND_BLUE },
  title: { fontSize: 20, fontWeight: 700, color: "#000", marginTop: 2 },
  subtitle: { fontSize: 9, color: "#555", marginTop: 6, lineHeight: 1.4, maxWidth: 420 },
  accentLine: { height: 3, backgroundColor: PRIMARY_GREEN, marginHorizontal: 40, marginBottom: 16 },
  body: { paddingHorizontal: 40 },
  table: { borderTop: 1, borderTopColor: "#eee" },
  tableRow: { flexDirection: "row", borderBottom: 1, borderBottomColor: "#eee", paddingVertical: 6 },
  tableHeaderRow: { flexDirection: "row", paddingVertical: 6, backgroundColor: "#f7f7f7" },
  headerCell: { fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: "#555" },
  colStage: { width: "16%", fontSize: 9 },
  colDesc: { width: "26%", fontSize: 9 },
  colQty: { width: "8%", fontSize: 9 },
  colPosition: { width: "18%", fontSize: 9 },
  colSupplier: { width: "16%", fontSize: 9 },
  colNotes: { width: "16%", fontSize: 8, color: "#666" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: 1,
    borderTopColor: "#eee",
    paddingTop: 8,
    fontSize: 8,
    color: "#999",
  },
});

export function buildPowerPage(data: PowerPdfData, logoBuffer: Buffer, generatedAt: string) {
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header} fixed>
        <View style={styles.headerLeft}>
          <Image src={logoBuffer} style={styles.logo} />
          <Text style={styles.brand}>The Bridge AV Group</Text>
        </View>
        <Text style={styles.headerMeta}>gegenereerd op {generatedAt}</Text>
      </View>

      <View style={styles.titleBlock}>
        <Text style={styles.eyebrow}>Stroom</Text>
        <Text style={styles.title}>{data.projectName}</Text>
        <Text style={styles.subtitle}>Stroomaanvragen per podium: wat, hoeveel en op welke positie.</Text>
      </View>
      <View style={styles.accentLine} />

      <View style={styles.body}>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colStage, styles.headerCell]}>Podium</Text>
            <Text style={[styles.colDesc, styles.headerCell]}>Wat</Text>
            <Text style={[styles.colQty, styles.headerCell]}>Aantal</Text>
            <Text style={[styles.colPosition, styles.headerCell]}>Positie</Text>
            <Text style={[styles.colSupplier, styles.headerCell]}>Leverancier</Text>
            <Text style={[styles.colNotes, styles.headerCell]}>Opmerkingen</Text>
          </View>
          {data.entries.map((entry, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.colStage}>{entry.stage_name ?? "Projectbreed"}</Text>
              <Text style={styles.colDesc}>{entry.description}</Text>
              <Text style={styles.colQty}>{entry.quantity}</Text>
              <Text style={styles.colPosition}>{entry.position || "—"}</Text>
              <Text style={styles.colSupplier}>{entry.supplier_name ?? "—"}</Text>
              <Text style={styles.colNotes}>{entry.notes || "—"}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer} fixed>
        <Text>The Bridge AV Group — thebridgeavgroup.com</Text>
        <Text render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} / ${totalPages}`} />
      </View>
    </Page>
  );
}

export async function generatePowerPdf(data: PowerPdfData): Promise<Buffer> {
  registerFonts();
  const logoBuffer = fs.readFileSync(LOGO_PATH);
  const generatedAt = data.generatedAt.toLocaleString("nl-NL");

  return renderToBuffer(<Document>{buildPowerPage(data, logoBuffer, generatedAt)}</Document>);
}
