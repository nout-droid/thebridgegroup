import "server-only";
import path from "node:path";
import fs from "node:fs";
import { Document, Page, Text, View, Image, Font, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

export interface FlightRequestEntry {
  name: string;
  passportNumber: string;
  departureAirport: string;
  destination: string;
  departureAt: string;
  returnAt: string;
  bookingNumber: string;
  ticketNumber: string;
}

export interface FlightRequestPdfData {
  projectName: string;
  generatedAt: Date;
  entries: FlightRequestEntry[];
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
  page: { fontFamily: "Poppins", fontSize: 9, color: "#111", paddingBottom: 60 },
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
  subtitle: { fontSize: 9, color: "#555", marginTop: 6, lineHeight: 1.4, maxWidth: 460 },
  accentLine: { height: 3, backgroundColor: PRIMARY_GREEN, marginHorizontal: 40, marginBottom: 16 },
  body: { paddingHorizontal: 40 },
  entry: { marginBottom: 14, borderBottom: 1, borderBottomColor: "#eee", paddingBottom: 10 },
  entryName: { fontSize: 12, fontWeight: 700, color: "#000" },
  row: { flexDirection: "row", marginTop: 4 },
  label: { width: 110, fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: "#555" },
  value: { fontSize: 9, color: "#111", flex: 1 },
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

export async function generateFlightRequestPdf(data: FlightRequestPdfData): Promise<Buffer> {
  registerFonts();
  const logoBuffer = fs.readFileSync(LOGO_PATH);
  const generatedAt = data.generatedAt.toLocaleString("nl-NL");

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <Image src={logoBuffer} style={styles.logo} />
            <Text style={styles.brand}>The Bridge AV Group</Text>
          </View>
          <Text style={styles.headerMeta}>gegenereerd op {generatedAt}</Text>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>Vluchtaanvraag</Text>
          <Text style={styles.title}>{data.projectName}</Text>
          <Text style={styles.subtitle}>
            Aanvraag voor vliegtickets, ter verwerking door de boekingsagency.
          </Text>
        </View>
        <View style={styles.accentLine} />

        <View style={styles.body}>
          {data.entries.map((entry, index) => (
            <View key={index} style={styles.entry}>
              <Text style={styles.entryName}>{entry.name || "Naam volgt"}</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Paspoortnummer</Text>
                <Text style={styles.value}>{entry.passportNumber || "—"}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Vertrekluchthaven</Text>
                <Text style={styles.value}>{entry.departureAirport || "—"}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Bestemming</Text>
                <Text style={styles.value}>{entry.destination || "—"}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Vertrek</Text>
                <Text style={styles.value}>{entry.departureAt || "—"}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Retour</Text>
                <Text style={styles.value}>{entry.returnAt || "—"}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Boekingsnummer</Text>
                <Text style={styles.value}>{entry.bookingNumber || "—"}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Ticketnummer</Text>
                <Text style={styles.value}>{entry.ticketNumber || "—"}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text>The Bridge AV Group — thebridgeavgroup.com</Text>
          <Text render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
