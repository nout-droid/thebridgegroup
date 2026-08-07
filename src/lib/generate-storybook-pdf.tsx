import "server-only";
import path from "node:path";
import { Document, Page, Text, View, Image, Font, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { OrgBranding } from "./server/organization";
import { resolveLogoBuffer } from "./pdf-branding";

export interface StorybookPdfImage {
  url: string;
  caption: string;
}

export interface StorybookPdfChapter {
  title: string;
  description: string;
  images: StorybookPdfImage[];
}

export interface StorybookPdfData {
  projectName: string;
  generatedAt: Date;
  chapters: StorybookPdfChapter[];
}

const FONT_DIR = path.join(process.cwd(), "node_modules/@fontsource/poppins/files");

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
  tagline: { fontSize: 9, fontStyle: "italic", color: "#888" },
  eyebrow: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: "#046bd2",
    marginTop: 6,
  },
  title: { fontSize: 20, fontWeight: 700, color: "#000", marginTop: 2 },
  accentLine: { height: 3, marginHorizontal: 40, marginBottom: 16 },
  body: { paddingHorizontal: 40 },
  chapter: { marginBottom: 20 },
  chapterHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  chapterAccent: { width: 4, height: 12, marginRight: 8 },
  chapterTitle: { fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#000" },
  chapterDescription: { fontSize: 10, lineHeight: 1.5, color: "#333", marginLeft: 12, marginBottom: 8 },
  imageGrid: { flexDirection: "row", flexWrap: "wrap", marginLeft: 12, gap: 8 },
  imageBlock: { width: 150 },
  image: { width: 150, height: 100, objectFit: "cover", borderRadius: 4 },
  caption: { fontSize: 7, color: "#777", marginTop: 2 },
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

export async function generateStorybookPdf(data: StorybookPdfData, branding: OrgBranding): Promise<Buffer> {
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
          <Text style={styles.tagline}>We innovate your event</Text>
          <Text style={styles.eyebrow}>Storybook</Text>
          <Text style={styles.title}>{data.projectName}</Text>
        </View>
        <View style={[styles.accentLine, brand.line]} />

        <View style={styles.body}>
          {data.chapters.map((chapter, index) => (
            <View key={index} style={styles.chapter} wrap={false}>
              <View style={styles.chapterHeader}>
                <View style={[styles.chapterAccent, brand.line]} />
                <Text style={styles.chapterTitle}>{chapter.title}</Text>
              </View>
              {chapter.description && (
                <Text style={styles.chapterDescription}>{chapter.description}</Text>
              )}
              {chapter.images.length > 0 && (
                <View style={styles.imageGrid}>
                  {chapter.images.map((image, imgIndex) => (
                    <View key={imgIndex} style={styles.imageBlock}>
                      <Image src={image.url} style={styles.image} />
                      {image.caption && <Text style={styles.caption}>{image.caption}</Text>}
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
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
