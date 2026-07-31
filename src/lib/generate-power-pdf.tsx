import "server-only";
import path from "node:path";
import { Document, Page, Text, View, Image, Font, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { OrgBranding } from "./server/organization";
import { resolveLogoBuffer } from "./pdf-branding";

export interface PowerPdfEntry {
  stage_name: string | null;
  description: string;
  quantity: number;
  position: string;
  supplier_name: string | null;
  notes: string;
  amps: number | null;
  phase: 1 | 3;
}

export interface PowerPdfAreaLoad {
  areaName: string;
  kw: number;
}

export interface PowerPdfData {
  projectName: string;
  generatedAt: Date;
  entries: PowerPdfEntry[];
  areaLoads: PowerPdfAreaLoad[];
  totalKw: number;
}

const FONT_DIR = path.join(process.cwd(), "node_modules/@fontsource/poppins/files");

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
  brand: { fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5 },
  headerMeta: { fontSize: 8, color: "#ffffffaa", marginTop: 3 },
  titleBlock: { paddingHorizontal: 40, paddingTop: 24, paddingBottom: 12 },
  eyebrow: { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: BRAND_BLUE },
  title: { fontSize: 20, fontWeight: 700, color: "#000", marginTop: 2 },
  subtitle: { fontSize: 9, color: "#555", marginTop: 6, lineHeight: 1.4, maxWidth: 420 },
  accentLine: { height: 3, marginHorizontal: 40, marginBottom: 16 },
  body: { paddingHorizontal: 40 },
  table: { borderTop: 1, borderTopColor: "#eee" },
  tableRow: { flexDirection: "row", borderBottom: 1, borderBottomColor: "#eee", paddingVertical: 6 },
  tableHeaderRow: { flexDirection: "row", paddingVertical: 6, backgroundColor: "#f7f7f7" },
  headerCell: { fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: "#555" },
  colStage: { width: "14%", fontSize: 9 },
  colDesc: { width: "22%", fontSize: 9 },
  colQty: { width: "7%", fontSize: 9 },
  colLoad: { width: "11%", fontSize: 9 },
  colPosition: { width: "15%", fontSize: 9 },
  colSupplier: { width: "15%", fontSize: 9 },
  colNotes: { width: "16%", fontSize: 8, color: "#666" },
  loadTable: { marginTop: 16, borderTop: 1, borderTopColor: "#eee" },
  loadRow: { flexDirection: "row", borderBottom: 1, borderBottomColor: "#eee", paddingVertical: 5 },
  loadHeaderRow: { flexDirection: "row", paddingVertical: 5, backgroundColor: "#f7f7f7" },
  loadColArea: { width: "70%", fontSize: 9 },
  loadColKw: { width: "30%", fontSize: 9 },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginTop: 4, marginBottom: 4 },
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

export function buildPowerPage(
  data: PowerPdfData,
  logoBuffer: Buffer,
  generatedAt: string,
  branding: OrgBranding
) {
  const brand = StyleSheet.create({
    text: { color: branding.brandColor },
    line: { backgroundColor: branding.brandColor },
  });

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header} fixed>
        <View style={styles.headerLeft}>
          <Image src={logoBuffer} style={styles.logo} />
          <Text style={[styles.brand, brand.text]}>{branding.name}</Text>
        </View>
        <Text style={styles.headerMeta}>gegenereerd op {generatedAt}</Text>
      </View>

      <View style={styles.titleBlock}>
        <Text style={styles.eyebrow}>Stroom</Text>
        <Text style={styles.title}>{data.projectName}</Text>
        <Text style={styles.subtitle}>Stroomaanvragen per podium: wat, hoeveel en op welke positie.</Text>
      </View>
      <View style={[styles.accentLine, brand.line]} />

      <View style={styles.body}>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colStage, styles.headerCell]}>Podium</Text>
            <Text style={[styles.colDesc, styles.headerCell]}>Wat</Text>
            <Text style={[styles.colQty, styles.headerCell]}>Aantal</Text>
            <Text style={[styles.colLoad, styles.headerCell]}>Belasting</Text>
            <Text style={[styles.colPosition, styles.headerCell]}>Positie</Text>
            <Text style={[styles.colSupplier, styles.headerCell]}>Leverancier</Text>
            <Text style={[styles.colNotes, styles.headerCell]}>Opmerkingen</Text>
          </View>
          {data.entries.map((entry, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.colStage}>{entry.stage_name ?? "Projectbreed"}</Text>
              <Text style={styles.colDesc}>{entry.description}</Text>
              <Text style={styles.colQty}>{entry.quantity}</Text>
              <Text style={styles.colLoad}>
                {entry.amps ? `${entry.amps}A / ${entry.phase}-fase` : "—"}
              </Text>
              <Text style={styles.colPosition}>{entry.position || "—"}</Text>
              <Text style={styles.colSupplier}>{entry.supplier_name ?? "—"}</Text>
              <Text style={styles.colNotes}>{entry.notes || "—"}</Text>
            </View>
          ))}
        </View>

        {data.areaLoads.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Belasting per area</Text>
            <View style={styles.loadTable}>
              <View style={styles.loadHeaderRow}>
                <Text style={[styles.loadColArea, styles.headerCell]}>Area</Text>
                <Text style={[styles.loadColKw, styles.headerCell]}>kW</Text>
              </View>
              {data.areaLoads.map((entry, index) => (
                <View key={index} style={styles.loadRow}>
                  <Text style={styles.loadColArea}>{entry.areaName}</Text>
                  <Text style={styles.loadColKw}>{entry.kw.toFixed(1)}</Text>
                </View>
              ))}
              <View style={styles.loadRow}>
                <Text style={[styles.loadColArea, { fontWeight: 700 }]}>Totaal</Text>
                <Text style={[styles.loadColKw, { fontWeight: 700 }]}>{data.totalKw.toFixed(1)}</Text>
              </View>
            </View>
          </>
        )}
      </View>

      <View style={styles.footer} fixed>
        <Text>{branding.name}</Text>
        <Text render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} / ${totalPages}`} />
      </View>
    </Page>
  );
}

export async function generatePowerPdf(data: PowerPdfData, branding: OrgBranding): Promise<Buffer> {
  registerFonts();
  const logoBuffer = await resolveLogoBuffer(branding);
  const generatedAt = data.generatedAt.toLocaleString("nl-NL");

  return renderToBuffer(<Document>{buildPowerPage(data, logoBuffer, generatedAt, branding)}</Document>);
}
