import "server-only";
import path from "node:path";
import { Document, Page, Text, View, Image, Font, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { OrgBranding } from "./server/organization";
import { resolveLogoBuffer } from "./pdf-branding";

export interface PakbonEntry {
  name: string;
  category: string;
  asset_number: string;
  quantity: number;
  access_dates: string[];
}

export interface PakbonPdfData {
  projectName: string;
  generatedAt: Date;
  entries: PakbonEntry[];
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
  eyebrow: { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#046bd2" },
  title: { fontSize: 20, fontWeight: 700, color: "#000", marginTop: 2 },
  subtitle: { fontSize: 9, color: "#555", marginTop: 6, lineHeight: 1.4, maxWidth: 420 },
  accentLine: { height: 3, marginHorizontal: 40, marginBottom: 16 },
  body: { paddingHorizontal: 40 },
  table: { borderTop: 1, borderTopColor: "#eee" },
  tableRow: { flexDirection: "row", borderBottom: 1, borderBottomColor: "#eee", paddingVertical: 6 },
  tableHeaderRow: { flexDirection: "row", paddingVertical: 6, backgroundColor: "#f7f7f7" },
  headerCell: { fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: "#555" },
  colName: { width: "34%", fontSize: 9 },
  colCategory: { width: "20%", fontSize: 9 },
  colAsset: { width: "18%", fontSize: 8, color: "#666" },
  colQty: { width: "10%", fontSize: 9 },
  colDates: { width: "18%", fontSize: 8, color: "#666" },
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

export async function generatePakbonPdf(data: PakbonPdfData, branding: OrgBranding): Promise<Buffer> {
  registerFonts();
  const logoBuffer = await resolveLogoBuffer(branding);
  const generatedAt = data.generatedAt.toLocaleString("nl-NL");
  const brand = StyleSheet.create({
    text: { color: branding.brandColor },
    line: { backgroundColor: branding.brandColor },
  });

  return renderToBuffer(
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <Image src={logoBuffer} style={styles.logo} />
            <Text style={[styles.brand, brand.text]}>{branding.name}</Text>
          </View>
          <Text style={styles.headerMeta}>gegenereerd op {generatedAt}</Text>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>Pakbon</Text>
          <Text style={styles.title}>{data.projectName}</Text>
          <Text style={styles.subtitle}>Eigen materiaal dat meegaat voor dit project.</Text>
        </View>
        <View style={[styles.accentLine, brand.line]} />

        <View style={styles.body}>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.colName, styles.headerCell]}>Item</Text>
              <Text style={[styles.colCategory, styles.headerCell]}>Categorie</Text>
              <Text style={[styles.colAsset, styles.headerCell]}>Assetnummer</Text>
              <Text style={[styles.colQty, styles.headerCell]}>Aantal</Text>
              <Text style={[styles.colDates, styles.headerCell]}>Dagen</Text>
            </View>
            {data.entries.map((entry, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.colName}>{entry.name}</Text>
                <Text style={styles.colCategory}>{entry.category || "—"}</Text>
                <Text style={styles.colAsset}>{entry.asset_number || "—"}</Text>
                <Text style={styles.colQty}>{entry.quantity}</Text>
                <Text style={styles.colDates}>{entry.access_dates.join(", ") || "—"}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>{branding.name}</Text>
          <Text render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
