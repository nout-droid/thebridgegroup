import "server-only";
import path from "node:path";
import QRCode from "qrcode";
import { Document, Page, Text, View, Image, Font, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { OrgBranding } from "./server/organization";
import { resolveLogoBuffer } from "./pdf-branding";

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
  },
  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  name: { fontSize: 20, fontWeight: 700, color: "#000", textAlign: "center" },
  role: { fontSize: 11, color: BRAND_BLUE, fontWeight: 600, marginTop: 4, textAlign: "center" },
  qr: { width: 110, height: 110, marginTop: 16 },
  project: { fontSize: 8, color: "#555", marginTop: 12, textAlign: "center" },
  footer: { fontSize: 6, color: "#999", textAlign: "center", paddingBottom: 10 },
});

export async function generateBadgePdf(data: BadgePdfData, branding: OrgBranding): Promise<Buffer> {
  registerFonts();
  const logoBuffer = await resolveLogoBuffer(branding);
  const brand = StyleSheet.create({
    text: { color: branding.brandColor },
    line: { backgroundColor: branding.brandColor },
  });

  const pages = await Promise.all(
    data.entries.map(async (entry) => {
      const qrBuffer = await QRCode.toBuffer(entry.badgeUrl, { margin: 1, width: 300 });
      return (
        <Page key={entry.badgeUrl} size={BADGE_SIZE} style={styles.page}>
          <View style={styles.header}>
            <Image src={logoBuffer} style={styles.logo} />
            <Text style={[styles.brand, brand.text]}>{branding.name}</Text>
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
