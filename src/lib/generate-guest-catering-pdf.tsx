import "server-only";
import path from "node:path";
import { Document, Page, Text, View, Image, Font, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { OrgBranding } from "./server/organization";
import { resolveLogoBuffer } from "./pdf-branding";

export interface GuestCateringPdfEntry {
  order_date: string;
  stage_name: string | null;
  moment: string;
  style: string;
  guest_count: number;
  veggie_count: number;
  vegan_count: number;
  kids_count: number;
  special_diet_count: number;
  supplier_name: string | null;
  notes: string;
  allergies: string;
}

export interface GuestCateringPdfDietary {
  name: string;
  plus_one_name: string;
  dietary_notes: string;
}

export interface GuestCateringPdfData {
  projectName: string;
  generatedAt: Date;
  entries: GuestCateringPdfEntry[];
  dietary: GuestCateringPdfDietary[];
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
  eyebrow: { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 },
  title: { fontSize: 20, fontWeight: 700, color: "#000", marginTop: 2 },
  subtitle: { fontSize: 9, color: "#555", marginTop: 6, lineHeight: 1.4, maxWidth: 440 },
  accentLine: { height: 3, marginHorizontal: 40, marginBottom: 16 },
  body: { paddingHorizontal: 40 },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginBottom: 6, marginTop: 4 },
  table: { borderTop: 1, borderTopColor: "#eee" },
  tableRow: { flexDirection: "row", borderBottom: 1, borderBottomColor: "#eee", paddingVertical: 6 },
  tableHeaderRow: { flexDirection: "row", paddingVertical: 6, backgroundColor: "#f7f7f7" },
  headerCell: { fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: "#555" },
  colDate: { width: "10%", fontSize: 9 },
  colStage: { width: "10%", fontSize: 9 },
  colMoment: { width: "9%", fontSize: 9 },
  colStyle: { width: "11%", fontSize: 9 },
  colSupplier: { width: "11%", fontSize: 9 },
  colNum: { width: "7%", fontSize: 9, textAlign: "center" },
  colNotes: { width: "11%", fontSize: 8, color: "#666" },
  colAllergies: { width: "10%", fontSize: 8, color: "#b91c1c" },
  dietaryRow: { flexDirection: "row", paddingVertical: 4, borderBottom: 1, borderBottomColor: "#f2f2f2" },
  dietaryName: { width: "35%", fontSize: 9, fontWeight: 600 },
  dietaryNotes: { width: "65%", fontSize: 9, color: "#333" },
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

export async function generateGuestCateringPdf(
  data: GuestCateringPdfData,
  branding: OrgBranding
): Promise<Buffer> {
  registerFonts();
  const logoBuffer = await resolveLogoBuffer(branding);
  const generatedAt = data.generatedAt.toLocaleString("nl-NL");
  const brand = StyleSheet.create({
    text: { color: branding.brandColor },
    line: { backgroundColor: branding.brandColor },
  });

  const doc = (
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
          <Text style={[styles.eyebrow, brand.text]}>Catering gasten</Text>
          <Text style={styles.title}>{data.projectName}</Text>
          <Text style={styles.subtitle}>
            Aantallen per dag, area, moment en stijl, met dieetcategorieën voor gasten.
          </Text>
        </View>
        <View style={[styles.accentLine, brand.line]} />

        <View style={styles.body}>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.colDate, styles.headerCell]}>Datum</Text>
              <Text style={[styles.colStage, styles.headerCell]}>Area</Text>
              <Text style={[styles.colMoment, styles.headerCell]}>Moment</Text>
              <Text style={[styles.colStyle, styles.headerCell]}>Stijl</Text>
              <Text style={[styles.colSupplier, styles.headerCell]}>Leverancier</Text>
              <Text style={[styles.colNum, styles.headerCell]}>Gasten</Text>
              <Text style={[styles.colNum, styles.headerCell]}>Veg/Vgn</Text>
              <Text style={[styles.colNum, styles.headerCell]}>Kids</Text>
              <Text style={[styles.colNotes, styles.headerCell]}>Opmerkingen</Text>
              <Text style={[styles.colAllergies, styles.headerCell]}>Allergieën</Text>
            </View>
            {data.entries.map((entry, index) => (
              <View key={index} style={styles.tableRow} wrap={false}>
                <Text style={styles.colDate}>{entry.order_date}</Text>
                <Text style={styles.colStage}>{entry.stage_name ?? "Projectbreed"}</Text>
                <Text style={styles.colMoment}>{entry.moment}</Text>
                <Text style={styles.colStyle}>{entry.style}</Text>
                <Text style={styles.colSupplier}>{entry.supplier_name ?? "—"}</Text>
                <Text style={styles.colNum}>{entry.guest_count}</Text>
                <Text style={styles.colNum}>
                  {entry.veggie_count}/{entry.vegan_count}
                </Text>
                <Text style={styles.colNum}>{entry.kids_count}</Text>
                <Text style={styles.colNotes}>{entry.notes}</Text>
                <Text style={styles.colAllergies}>{entry.allergies || "—"}</Text>
              </View>
            ))}
          </View>

          {data.dietary.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={styles.sectionTitle}>Dieetwensen vanuit RSVP</Text>
              {data.dietary.map((g, index) => (
                <View key={index} style={styles.dietaryRow} wrap={false}>
                  <Text style={styles.dietaryName}>
                    {g.name}
                    {g.plus_one_name ? ` (+1: ${g.plus_one_name})` : ""}
                  </Text>
                  <Text style={styles.dietaryNotes}>{g.dietary_notes}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text>{branding.name}</Text>
          <Text render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
