import { createClient } from "@/lib/supabase/server";
import { getProjectOrNotFound } from "@/lib/server/get-project";
import { getSignedPortalUrl } from "@/lib/server/portal-storage";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { uploadProjectDocument, deleteProjectDocument } from "../documents-actions";
import { uploadParkingPass, deleteParkingPass } from "../parking-passes-actions";
import { addLostFoundItem, updateLostFoundStatus, deleteLostFoundItem } from "../lost-found-actions";
import { ProjectSubNav } from "../project-sub-nav";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";
import { INTAKE_CHECKLIST_SECTIONS } from "@/lib/intake-checklist-sections";

const DOCUMENTS_PAGE_LABELS = [
  "Nieuw document toevoegen",
  "Voor losse bestanden die nergens anders bij horen, bijvoorbeeld tekeningen.",
  "Titel",
  "Bv. Plattegrond zaal",
  "Bestand",
  "Uploaden",
  "Alle documenten",
  "Nog geen documenten.",
  "Bekijken",
  "Verwijderen",
  "Overig",
  "Offerte",
  "Gastenportaal",
  "Checklist",
  "nog te splitsen",
  "Parkeerpassen",
  "Voeg een parkeerpas toe (PDF of afbeelding) en kies welke portalen 'm mogen zien.",
  "Bv. Parkeerpas VIP",
  "Zichtbaar voor crew",
  "Zichtbaar voor gasten",
  "Zichtbaar voor aanwezigen",
  "Nog geen parkeerpassen.",
  "Lost & found",
  "Kwijtgeraakte spullen — zichtbaar in het gastenportaal zodat gasten kunnen checken of iets van hen gevonden is.",
  "Omschrijving",
  "Bv. Zwarte jas, maat M",
  "Foto (optioneel)",
  "Toevoegen",
  "Nog geen lost & found items.",
  "Kwijt",
  "Gevonden",
  "Opgehaald",
];

type DocRow = {
  id: string;
  title: string;
  storagePath: string;
  source: "Overig" | "Offerte" | "Gastenportaal" | "Checklist";
  deletable: boolean;
  createdAt: string;
};

export default async function ProjectDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Deze queries hebben alleen `id` nodig — dus in één keer parallel opvragen i.p.v. na
  // elkaar, anders wacht de pagina op 7 losse round-trips naar Supabase.
  const [
    project,
    lang,
    { data: ownDocs },
    { data: categories },
    { data: unsplitQuoteDocuments },
    { data: guestDocuments },
    { data: checklist },
    { data: parkingPasses },
    { data: lostFoundItems },
  ] = await Promise.all([
    getProjectOrNotFound(supabase, id),
    getAppLang(),
    supabase
      .from("project_documents")
      .select("id, title, storage_path, created_at")
      .eq("project_id", id),
    supabase.from("categories").select("id, name").eq("project_id", id),
    supabase
      .from("quote_documents")
      .select("id, storage_path, original_filename, created_at, supplier:suppliers(name)")
      .eq("project_id", id)
      .is("quote_id", null),
    supabase
      .from("guest_documents")
      .select("id, title, storage_path, created_at")
      .eq("project_id", id),
    supabase
      .from("intake_checklists")
      .select("id")
      .eq("project_id", id)
      .maybeSingle<{ id: string }>(),
    supabase
      .from("parking_passes")
      .select("id, title, storage_path, visible_to_crew, visible_to_guests, visible_to_attendees, created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("lost_found_items")
      .select("id, description, photo_path, status, created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const t = await createTranslator(lang, [
    ...DOCUMENTS_PAGE_LABELS,
    ...(lostFoundItems ?? []).map((item) => item.description),
  ]);

  const rows: DocRow[] = [];

  for (const doc of ownDocs ?? []) {
    rows.push({
      id: doc.id,
      title: doc.title,
      storagePath: doc.storage_path,
      source: "Overig",
      deletable: true,
      createdAt: doc.created_at,
    });
  }

  const categoryMap = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const categoryIds = (categories ?? []).map((c) => c.id);

  if (categoryIds.length > 0) {
    const { data: quotes } = await supabase
      .from("quotes")
      .select("id, category_id, supplier:suppliers(name)")
      .in("category_id", categoryIds);
    const quoteMap = new Map(
      (quotes ?? []).map((q) => [
        q.id,
        {
          categoryName: categoryMap.get(q.category_id) ?? "",
          supplierName: (Array.isArray(q.supplier) ? q.supplier[0]?.name : (q.supplier as { name: string } | null)?.name) ?? "",
        },
      ])
    );
    const quoteIds = (quotes ?? []).map((q) => q.id);

    if (quoteIds.length > 0) {
      const { data: quoteDocuments } = await supabase
        .from("quote_documents")
        .select("id, quote_id, storage_path, original_filename, created_at")
        .in("quote_id", quoteIds);
      for (const doc of quoteDocuments ?? []) {
        const info = quoteMap.get(doc.quote_id);
        const label = [info?.categoryName, info?.supplierName].filter(Boolean).join(" — ");
        rows.push({
          id: doc.id,
          title: label ? `${label} (${doc.original_filename})` : doc.original_filename,
          storagePath: doc.storage_path,
          source: "Offerte",
          deletable: false,
          createdAt: doc.created_at,
        });
      }
    }
  }

  for (const doc of unsplitQuoteDocuments ?? []) {
    const supplierName =
      (Array.isArray(doc.supplier) ? doc.supplier[0]?.name : (doc.supplier as { name: string } | null)?.name) ?? "";
    rows.push({
      id: doc.id,
      title: `${supplierName ? `${supplierName} — ` : ""}${t("nog te splitsen")} (${doc.original_filename})`,
      storagePath: doc.storage_path,
      source: "Offerte",
      deletable: false,
      createdAt: doc.created_at,
    });
  }

  for (const doc of guestDocuments ?? []) {
    rows.push({
      id: doc.id,
      title: doc.title,
      storagePath: doc.storage_path,
      source: "Gastenportaal",
      deletable: false,
      createdAt: doc.created_at,
    });
  }

  if (checklist) {
    const { data: photos } = await supabase
      .from("intake_checklist_photos")
      .select("id, section_key, storage_path, original_filename, created_at")
      .eq("checklist_id", checklist.id);
    for (const photo of photos ?? []) {
      const section = INTAKE_CHECKLIST_SECTIONS.find((s) => s.key === photo.section_key);
      const sectionTitle = section ? (lang === "en" ? section.title_en : section.title_nl) : photo.section_key;
      rows.push({
        id: photo.id,
        title: `${sectionTitle} — ${photo.original_filename}`,
        storagePath: photo.storage_path,
        source: "Checklist",
        deletable: false,
        createdAt: photo.created_at,
      });
    }
  }

  rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const rowsWithUrls = await Promise.all(
    rows.map(async (row) => ({
      ...row,
      url: await getSignedPortalUrl(row.storagePath),
    }))
  );

  const parkingPassesWithUrls = await Promise.all(
    (parkingPasses ?? []).map(async (pass) => ({
      ...pass,
      url: await getSignedPortalUrl(pass.storage_path),
    }))
  );

  const lostFoundWithUrls = await Promise.all(
    (lostFoundItems ?? []).map(async (item) => ({
      ...item,
      url: item.photo_path ? await getSignedPortalUrl(item.photo_path) : null,
    }))
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <ProjectSubNav projectId={project.id} projectName={project.name} active="documents" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Nieuw document toevoegen")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("Voor losse bestanden die nergens anders bij horen, bijvoorbeeld tekeningen.")}
            </p>
          </CardHeader>
          <CardContent>
            <form
              action={uploadProjectDocument.bind(null, project.id)}
              className="flex flex-wrap items-end gap-3"
            >
              <div className="flex-1 min-w-[200px] space-y-1">
                <label className="text-sm font-medium">{t("Titel")}</label>
                <Input name="title" placeholder={t("Bv. Plattegrond zaal")} required />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">{t("Bestand")}</label>
                <Input name="file" type="file" required />
              </div>
              <Button type="submit" size="sm">
                {t("Uploaden")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Alle documenten")}</CardTitle>
          </CardHeader>
          <CardContent>
            {rowsWithUrls.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("Nog geen documenten.")}</p>
            ) : (
              <ul className="divide-y">
                {rowsWithUrls.map((row) => (
                  <li key={`${row.source}-${row.id}`} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge variant="secondary">{t(row.source)}</Badge>
                      <span className="truncate text-sm">{row.title}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {row.url && (
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {t("Bekijken")}
                        </a>
                      )}
                      {row.deletable && (
                        <form action={deleteProjectDocument.bind(null, project.id, row.id)}>
                          <Button type="submit" size="sm" variant="ghost">
                            {t("Verwijderen")}
                          </Button>
                        </form>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Parkeerpassen")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("Voeg een parkeerpas toe (PDF of afbeelding) en kies welke portalen 'm mogen zien.")}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <form
              action={uploadParkingPass.bind(null, project.id)}
              className="flex flex-wrap items-end gap-3"
            >
              <div className="flex-1 min-w-[200px] space-y-1">
                <label className="text-sm font-medium">{t("Titel")}</label>
                <Input name="title" placeholder={t("Bv. Parkeerpas VIP")} required />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">{t("Bestand")}</label>
                <Input name="file" type="file" required />
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" name="visible_to_crew" defaultChecked />
                  {t("Zichtbaar voor crew")}
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" name="visible_to_guests" defaultChecked />
                  {t("Zichtbaar voor gasten")}
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" name="visible_to_attendees" defaultChecked />
                  {t("Zichtbaar voor aanwezigen")}
                </label>
              </div>
              <Button type="submit" size="sm">
                {t("Uploaden")}
              </Button>
            </form>

            {parkingPassesWithUrls.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("Nog geen parkeerpassen.")}</p>
            ) : (
              <ul className="divide-y">
                {parkingPassesWithUrls.map((pass) => (
                  <li key={pass.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="truncate text-sm">{pass.title}</span>
                      {pass.visible_to_crew && <Badge variant="secondary">{t("Zichtbaar voor crew")}</Badge>}
                      {pass.visible_to_guests && <Badge variant="secondary">{t("Zichtbaar voor gasten")}</Badge>}
                      {pass.visible_to_attendees && (
                        <Badge variant="secondary">{t("Zichtbaar voor aanwezigen")}</Badge>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {pass.url && (
                        <a
                          href={pass.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {t("Bekijken")}
                        </a>
                      )}
                      <form action={deleteParkingPass.bind(null, project.id, pass.id)}>
                        <Button type="submit" size="sm" variant="ghost">
                          {t("Verwijderen")}
                        </Button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Lost & found")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t(
                "Kwijtgeraakte spullen — zichtbaar in het gastenportaal zodat gasten kunnen checken of iets van hen gevonden is."
              )}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <form
              action={addLostFoundItem.bind(null, project.id)}
              className="flex flex-wrap items-end gap-3"
            >
              <div className="flex-1 min-w-[200px] space-y-1">
                <label className="text-sm font-medium">{t("Omschrijving")}</label>
                <Input name="description" placeholder={t("Bv. Zwarte jas, maat M")} required />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">{t("Foto (optioneel)")}</label>
                <Input name="photo" type="file" />
              </div>
              <Button type="submit" size="sm">
                {t("Toevoegen")}
              </Button>
            </form>

            {lostFoundWithUrls.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("Nog geen lost & found items.")}</p>
            ) : (
              <ul className="divide-y">
                {lostFoundWithUrls.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="truncate text-sm">{t(item.description)}</span>
                      <Badge variant={item.status === "claimed" ? "secondary" : "default"}>
                        {item.status === "lost" && t("Kwijt")}
                        {item.status === "found" && t("Gevonden")}
                        {item.status === "claimed" && t("Opgehaald")}
                      </Badge>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {t("Bekijken")}
                        </a>
                      )}
                      {(["lost", "found", "claimed"] as const)
                        .filter((s) => s !== item.status)
                        .map((s) => (
                          <form key={s} action={updateLostFoundStatus.bind(null, project.id, item.id, s)}>
                            <Button type="submit" size="sm" variant="outline">
                              {s === "lost" && t("Kwijt")}
                              {s === "found" && t("Gevonden")}
                              {s === "claimed" && t("Opgehaald")}
                            </Button>
                          </form>
                        ))}
                      <form action={deleteLostFoundItem.bind(null, project.id, item.id)}>
                        <Button type="submit" size="sm" variant="ghost">
                          {t("Verwijderen")}
                        </Button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
