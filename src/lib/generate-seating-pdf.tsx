import "server-only";
import path from "node:path";
import { Document, Page, Text, View, Image, Font, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { OrgBranding } from "./server/organization";
import { resolveLogoBuffer } from "./pdf-branding";

export interface SeatingPdfGuest {
  name: string;
  headcount: number;
  dietary_notes: string;
}

export interface SeatingPdfTable {
  name: string;
  capacity: number;
  stage_name: string | null;
  notes: string;
  guests: SeatingPdfGuest[];
}

export interface SeatingPdfUnassignedGuest {
  name: string;
  headcount: number;
}

export interface SeatingPdfData {
  projectName: string;
  generatedAt: Date;
  tables: SeatingPdfTable[];
  unassigned: SeatingPdfUnassignedGuest[];
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
  accentLine: { height: 3, marginHorizontal: 40, marginBottom: 16 },
  body: { paddingHorizontal: 40 },
  tableBlock: { marginBottom: 16 },
  tableHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  tableName: { fontSize: 12, fontWeight: 700, color: "#000" },
  tableMeta: { fontSize: 8, color: "#777", marginLeft: 8 },
  guestRow: { flexDirection: "row", paddingVertical: 3, borderBottom: 1, borderBottomColor: "#f2f2f2" },
  guestName: { width: "45%", fontSize: 9 },
  guestHeadcount: { width: "15%", fontSize: 9, textAlign: "center" },
  guestDietary: { width: "40%", fontSize: 8, color: "#777" },
  emptyNote: { fontSize: 8, color: "#999", fontStyle: "italic" },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginBottom: 6, marginTop: 4 },
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

export async function generateSeatingPdf(data: SeatingPdfData, branding: OrgBranding): Promise<Buffer> {
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
          <Text style={[styles.eyebrow, brand.text]}>Tafelindeling</Text>
          <Text style={styles.title}>{data.projectName}</Text>
        </View>
        <View style={[styles.accentLine, brand.line]} />

        <View style={styles.body}>
          {data.tables.map((table, index) => (
            <View key={index} style={styles.tableBlock} wrap={false}>
              <View style={styles.tableHeaderRow}>
                <Text style={styles.tableName}>{table.name}</Text>
                <Text style={styles.tableMeta}>
                  {table.guests.reduce((sum, g) => sum + g.headcount, 0)}/{table.capacity}
                  {table.stage_name ? ` · ${table.stage_name}` : ""}
                  {table.notes ? ` · ${table.notes}` : ""}
                </Text>
              </View>
              {table.guests.length > 0 ? (
                table.guests.map((guest, gIndex) => (
                  <View key={gIndex} style={styles.guestRow}>
                    <Text style={styles.guestName}>{guest.name}</Text>
                    <Text style={styles.guestHeadcount}>{guest.headcount}</Text>
                    <Text style={styles.guestDietary}>{guest.dietary_notes}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyNote}>Nog geen gasten toegewezen.</Text>
              )}
            </View>
          ))}

          {data.unassigned.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.sectionTitle}>Niet ingedeeld</Text>
              {data.unassigned.map((guest, index) => (
                <View key={index} style={styles.guestRow}>
                  <Text style={styles.guestName}>{guest.name}</Text>
                  <Text style={styles.guestHeadcount}>{guest.headcount}</Text>
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
