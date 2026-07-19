import "server-only";
import path from "node:path";
import fs from "node:fs";
import { Document, Page, Text, View, Image, Font, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

export interface CallsheetPdfItem {
  description: string;
}

export interface CallsheetPdfSection {
  title: string;
  content: string;
  items?: CallsheetPdfItem[];
}

export interface CallsheetPdfData {
  projectName: string;
  version: number;
  generatedAt: Date;
  sections: CallsheetPdfSection[];
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
      { src: path.join(FONT_DIR, "poppins-latin-500-normal.woff"), fontWeight: 500 },
      { src: path.join(FONT_DIR, "poppins-latin-600-normal.woff"), fontWeight: 600 },
      { src: path.join(FONT_DIR, "poppins-latin-700-normal.woff"), fontWeight: 700 },
      {
        src: path.join(FONT_DIR, "poppins-latin-400-italic.woff"),
        fontWeight: 400,
        fontStyle: "italic",
      },
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
  brand: {
    fontSize: 9,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: PRIMARY_GREEN,
  },
  headerMeta: { fontSize: 8, color: "#ffffffaa", marginTop: 3 },
  titleBlock: { paddingHorizontal: 40, paddingTop: 24, paddingBottom: 12 },
  tagline: { fontSize: 9, fontStyle: "italic", color: "#888" },
  eyebrow: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: BRAND_BLUE,
    marginTop: 6,
  },
  title: { fontSize: 20, fontWeight: 700, color: "#000", marginTop: 2 },
  subtitle: { fontSize: 9, color: "#555", marginTop: 6, lineHeight: 1.4, maxWidth: 420 },
  accentLine: { height: 3, backgroundColor: PRIMARY_GREEN, marginHorizontal: 40, marginBottom: 16 },
  body: { paddingHorizontal: 40 },
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  sectionAccent: { width: 4, height: 12, backgroundColor: PRIMARY_GREEN, marginRight: 8 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#000",
  },
  sectionContent: { fontSize: 10, lineHeight: 1.5, color: "#333", marginLeft: 12 },
  itemRow: { flexDirection: "row", marginLeft: 12, marginTop: 3 },
  itemBullet: { width: 10, fontSize: 10, color: BRAND_BLUE },
  itemText: { fontSize: 10, color: "#333", flex: 1 },
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

export async function generateCallsheetPdf(data: CallsheetPdfData): Promise<Buffer> {
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
          <Text style={styles.headerMeta}>
            Versie {data.version} — gegenereerd op {generatedAt}
          </Text>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.tagline}>We innovate your event</Text>
          <Text style={styles.eyebrow}>Callsheet</Text>
          <Text style={styles.title}>{data.projectName}</Text>
          <Text style={styles.subtitle}>
            Overzicht van de geselecteerde onderdelen voor externe verspreiding.
          </Text>
        </View>
        <View style={styles.accentLine} />

        <View style={styles.body}>
          {data.sections.map((section, index) => (
            <View key={index} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              <Text style={styles.sectionContent}>{section.content || "—"}</Text>
              {(section.items ?? []).map((item, itemIndex) => (
                <View key={itemIndex} style={styles.itemRow}>
                  <Text style={styles.itemBullet}>•</Text>
                  <Text style={styles.itemText}>{item.description}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text>The Bridge AV Group — thebridgeavgroup.com</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
