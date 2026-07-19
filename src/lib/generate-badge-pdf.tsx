import "server-only";
import path from "node:path";
import fs from "node:fs";
import QRCode from "qrcode";
import { Document, Page, Text, View, Image, Font, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

export interface BadgePdfEntry {
  name: string;
  role: string;
  badgeUrl: string;
}

export interface BadgePdfData {
  projectName: string;
  entries: BadgePdfEntry[];
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

// Badge-formaat: 85 x 120mm (staand), omgerekend naar PDF-punten (1mm ≈ 2.8346pt).
const BADGE_SIZE: [number, number] = [241, 340];

const styles = StyleSheet.create({
  page: { fontFamily: "Poppins", fontSize: 10, color: "#111" },
  header: { backgroundColor: "#000", paddingVertical: 14, alignItems: "center" },
  logo: { width: 22, height: 17, marginBottom: 4 },
  brand: {
    fontSize: 7,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: PRIMARY_GREEN,
  },
  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  name: { fontSize: 20, fontWeight: 700, color: "#000", textAlign: "center" },
  role: { fontSize: 11, color: BRAND_BLUE, fontWeight: 600, marginTop: 4, textAlign: "center" },
  qr: { width: 110, height: 110, marginTop: 16 },
  project: { fontSize: 8, color: "#555", marginTop: 12, textAlign: "center" },
  footer: { fontSize: 6, color: "#999", textAlign: "center", paddingBottom: 10 },
});

export async function generateBadgePdf(data: BadgePdfData): Promise<Buffer> {
  registerFonts();
  const logoBuffer = fs.readFileSync(LOGO_PATH);

  const pages = await Promise.all(
    data.entries.map(async (entry) => {
      const qrBuffer = await QRCode.toBuffer(entry.badgeUrl, { margin: 1, width: 300 });
      return (
        <Page key={entry.badgeUrl} size={BADGE_SIZE} style={styles.page}>
          <View style={styles.header}>
            <Image src={logoBuffer} style={styles.logo} />
            <Text style={styles.brand}>The Bridge AV Group</Text>
          </View>
          <View style={styles.body}>
            <Text style={styles.name}>{entry.name || "Naam volgt"}</Text>
            <Text style={styles.role}>{entry.role || "—"}</Text>
            <Image src={qrBuffer} style={styles.qr} />
            <Text style={styles.project}>{data.projectName}</Text>
          </View>
          <Text style={styles.footer}>Scan bij toegang/catering</Text>
        </Page>
      );
    })
  );

  const doc = <Document>{pages}</Document>;
  return renderToBuffer(doc);
}
