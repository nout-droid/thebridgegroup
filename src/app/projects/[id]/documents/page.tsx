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
import { ProjectSubNav } from "../project-sub-nav";
import { getAppLang } from "@/lib/server/lang";
import { createTranslator } from "@/lib/server/translate";

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
  ]);

  const t = await createTranslator(lang, DOCUMENTS_PAGE_LABELS);

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
      rows.push({
        id: photo.id,
        title: `${photo.section_key} — ${photo.original_filename}`,
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
      </main>
      <Footer />
    </div>
  );
}
