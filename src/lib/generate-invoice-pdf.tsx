import "server-only";
import path from "node:path";
import { Document, Page, Text, View, Image, Font, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { OrgBranding } from "./server/organization";
import type { AppLang } from "./server/lang";
import { createTranslator } from "./server/translate";
import { resolveLogoBuffer } from "./pdf-branding";

export interface InvoicePdfLine {
  categoryName: string;
  clientPrice: number;
}

export interface InvoicePdfGroup {
  // null = projectbrede categorieën (niet aan een podium gekoppeld)
  stageName: string | null;
  lines: InvoicePdfLine[];
}

export type InvoiceDocumentType = "factuur" | "offerte";

export interface InvoicePdfData {
  documentType: InvoiceDocumentType;
  lang: AppLang;
  projectName: string;
  clientName: string | null;
  eventDate: string | null;
  generatedAt: Date;
  groups: InvoicePdfGroup[];
  totalClientPrice: number;
  invoiceNumber: string;
  invoiceDate: string;
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
  accentLine: { height: 3, marginHorizontal: 40, marginBottom: 16 },
  body: { paddingHorizontal: 40 },
  summary: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottom: 1,
    borderBottomColor: "#eee",
  },
  summaryItem: { width: "33%", marginBottom: 8 },
  summaryLabel: { fontSize: 8, textTransform: "uppercase", letterSpacing: 0.5, color: "#888" },
  summaryValue: { fontSize: 11, fontWeight: 600, color: "#000", marginTop: 2 },
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  sectionAccent: { width: 4, height: 12, marginRight: 8 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#000",
  },
  lineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginLeft: 12,
    marginTop: 3,
    paddingBottom: 3,
    borderBottom: 1,
    borderBottomColor: "#f2f2f2",
  },
  lineText: { fontSize: 10, color: "#333", flex: 1 },
  linePrice: { fontSize: 10, color: "#333", fontWeight: 500 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    paddingTop: 12,
    borderTop: 1,
    borderTopColor: "#000",
  },
  totalLabel: { fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#000" },
  totalValue: { fontSize: 15, fontWeight: 700, color: "#000" },
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

function euro(value: number) {
  return `€ ${value.toFixed(2)}`;
}

// Vaste labels per taal (geen live DeepL-vertaling hier — dit document gaat vaak rechtstreeks
// naar een externe klant en moet een stabiel, voorspelbaar resultaat geven, niet iets dat kan
// wisselen tussen twee downloads). Dynamische inhoud (project-/podium-/categorienamen)
// gebruikt wél de bestaande createTranslator-utility, voor consistentie met wat de klant al
// in de app zelf ziet als die op EN staat.
const LABELS: Record<AppLang, Record<InvoiceDocumentType | "shared", Record<string, string>>> = {
  nl: {
    factuur: {
      eyebrow: "Factuur",
      intro: "Deze factuur geeft een overzicht van de kosten voor dit event.",
      number: "Factuurnummer",
      date: "Factuurdatum",
    },
    offerte: {
      eyebrow: "Offerte",
      intro: "Deze offerte geeft een overzicht van de kosten voor dit event.",
      number: "Offertenummer",
      date: "Offertedatum",
    },
    shared: {
      generatedOn: "gegenereerd op",
      client: "Klant",
      project: "Project",
      eventDate: "Event datum",
      projectWide: "Projectbreed",
      total: "Totaal",
      page: "Pagina",
    },
  },
  en: {
    factuur: {
      eyebrow: "Invoice",
      intro: "This invoice provides an overview of the costs for this event.",
      number: "Invoice number",
      date: "Invoice date",
    },
    offerte: {
      eyebrow: "Quote",
      intro: "This quote provides an overview of the costs for this event.",
      number: "Quote number",
      date: "Quote date",
    },
    shared: {
      generatedOn: "generated on",
      client: "Client",
      project: "Project",
      eventDate: "Event date",
      projectWide: "Project-wide",
      total: "Total",
      page: "Page",
    },
  },
};

export async function generateInvoicePdf(data: InvoicePdfData, branding: OrgBranding): Promise<Buffer> {
  registerFonts();
  const logoBuffer = await resolveLogoBuffer(branding);

  const l = LABELS[data.lang][data.documentType];
  const shared = LABELS[data.lang].shared;
  const dateLocale = data.lang === "en" ? "en-GB" : "nl-NL";

  const t = await createTranslator(data.lang, [
    data.projectName,
    shared.projectWide,
    ...data.groups.flatMap((g) => [g.stageName ?? "", ...g.lines.map((line) => line.categoryName)]),
  ]);

  const generatedAt = data.generatedAt.toLocaleString(dateLocale);
  const eventDate = data.eventDate
    ? new Date(data.eventDate).toLocaleDateString(dateLocale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";
  const invoiceDateFormatted = new Date(`${data.invoiceDate}T00:00:00`).toLocaleDateString(dateLocale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  // Accentkleur is per-organisatie (huisstijl) — StyleSheet.create() moet daarom per render
  // opnieuw met de juiste kleur, i.p.v. module-scope zoals de rest van `styles` hierboven.
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
          <Text style={styles.headerMeta}>
            {data.invoiceNumber} · {shared.generatedOn} {generatedAt}
          </Text>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.tagline}>We innovate your event</Text>
          <Text style={styles.eyebrow}>{l.eyebrow}</Text>
          <Text style={styles.title}>{t(data.projectName)}</Text>
          <Text style={styles.subtitle}>{l.intro}</Text>
        </View>
        <View style={[styles.accentLine, brand.line]} />

        <View style={styles.body}>
          <View style={styles.summary}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{l.number}</Text>
              <Text style={styles.summaryValue}>{data.invoiceNumber}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{l.date}</Text>
              <Text style={styles.summaryValue}>{invoiceDateFormatted}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{shared.client}</Text>
              <Text style={styles.summaryValue}>{data.clientName || "—"}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{shared.project}</Text>
              <Text style={styles.summaryValue}>{t(data.projectName)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{shared.eventDate}</Text>
              <Text style={styles.summaryValue}>{eventDate}</Text>
            </View>
          </View>

          {data.groups.map((group, index) => (
            <View key={index} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionAccent, brand.line]} />
                <Text style={styles.sectionTitle}>{group.stageName ? t(group.stageName) : shared.projectWide}</Text>
              </View>
              {group.lines.length === 0 ? (
                <Text style={styles.lineText}>—</Text>
              ) : (
                group.lines.map((line, lineIndex) => (
                  <View key={lineIndex} style={styles.lineRow}>
                    <Text style={styles.lineText}>{t(line.categoryName)}</Text>
                    <Text style={styles.linePrice}>{euro(line.clientPrice)}</Text>
                  </View>
                ))
              )}
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{shared.total}</Text>
            <Text style={styles.totalValue}>{euro(data.totalClientPrice)}</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>{branding.name}</Text>
          <Text render={({ pageNumber, totalPages }) => `${shared.page} ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
