import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CATALOG_CATEGORY_LABELS, catalogCategoryLabel, type MaterialListItem, type Supplier } from "@/lib/types";
import {
  deleteMaterialListItem,
  pushMaterialListGroupToQuote,
  updateMaterialListItem,
  uploadMaterialList,
} from "./actions";
import { MatchPicker } from "./match-picker";
import { AddMaterialListItem } from "./add-material-list-item";
import type { Translator } from "@/lib/server/translate";
import { MATCH_PICKER_LABELS, ADD_MATERIAL_LIST_ITEM_LABELS } from "./translation-labels";

export const MATERIAL_LIST_LABELS = [
  "Materiaallijst",
  "Uploaden",
  "Nog geen materiaallijst geüpload. Upload een CSV of Excel-export uit Vectorworks om automatisch een eerste prijsindicatie te krijgen.",
  "Omschrijving",
  "Aantal",
  "Match",
  "Prijs/dag",
  "Regeltotaal",
  "Geen match",
  "ook als standaard opslaan",
  "Opslaan",
  "Verwijderen",
  "Eerste prijsindicatie per categorie",
  "inkoop",
  "klant (indicatief,",
  "% marge)",
  "Overnemen als offerte",
  "Geschatte DMX-netwerkbehoefte (vuistregel)",
  ...MATCH_PICKER_LABELS,
  ...ADD_MATERIAL_LIST_ITEM_LABELS,
];

function lineTotal(item: MaterialListItem, multiplier: number) {
  if (item.unit_price == null) return null;
  return item.quantity * item.unit_price * multiplier;
}

export function MaterialList({
  projectId,
  stageId,
  items,
  suppliers,
  rentalMultiplier,
  defaultMarginPercentage,
  t,
}: {
  projectId: string;
  stageId: string | null;
  items: MaterialListItem[];
  suppliers: Supplier[];
  rentalMultiplier: number;
  defaultMarginPercentage: number;
  t: Translator;
}) {
  const matchPickerLabels = {
    wijzig: t("Wijzig"),
    zoekArtikel: t("Zoek artikel..."),
    zoek: t("Zoek"),
    nietsGevonden: t("Niets gevonden."),
    nieuwArtikelToevoegen: t("Nieuw artikel toevoegen"),
    nietJuisteArtikel: t("Niet het juiste artikel? Nieuw artikel toevoegen"),
    artikelnaam: t("Artikelnaam"),
    categorie: t("Categorie"),
    prijsPerDag: t("Prijs per dag (€)"),
    toevoegenKoppelen: t("Toevoegen & koppelen"),
    laatstGezien: t("laatst gezien"),
    kiesLeverancier: t("Kies leverancier"),
    categoryLabels: Object.fromEntries(
      Object.values(CATALOG_CATEGORY_LABELS).map((label) => [label, t(label)])
    ),
  };
  const addItemLabels = {
    addLine: t("+ Regel toevoegen"),
    searchPlaceholder: t("Zoek artikel in catalogus..."),
    search: t("Zoek"),
    cancel: t("Annuleren"),
  };
  const groups = new Map<
    string,
    { category: string; supplierId: string; supplierName: string; total: number }
  >();

  for (const item of items) {
    const article = item.matched_article;
    if (!article || item.unit_price == null) continue;
    const key = `${article.category}::${article.supplier_id}`;
    const total = lineTotal(item, rentalMultiplier) ?? 0;
    const existing = groups.get(key);
    if (existing) {
      existing.total += total;
    } else {
      groups.set(key, {
        category: article.category,
        supplierId: article.supplier_id,
        supplierName: article.supplier?.name ?? "Onbekend",
        total,
      });
    }
  }

  // Vuistregel-inschatting voor DMX-netwerkbehoefte bij licht: ~20 armaturen per universe,
  // ~4 universes per node, ~4 nodes per switch. Puur een richtlijn — geen vervanging voor het
  // controleren van de daadwerkelijke fixture-specs en netwerktopologie.
  const lightFixtureCount = items.reduce((sum, item) => {
    return item.matched_article?.category === "LIGHT" ? sum + item.quantity : sum;
  }, 0);
  const estimatedUniverses = Math.ceil(lightFixtureCount / 20);
  const estimatedNodes = Math.ceil(estimatedUniverses / 4);
  const estimatedSwitches = Math.ceil(estimatedNodes / 4);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("Materiaallijst")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form action={uploadMaterialList.bind(null, projectId, stageId)} className="flex items-center gap-2">
          <Input type="file" name="file" accept=".csv,.xlsx" required className="max-w-xs" />
          <Button type="submit" size="sm">
            {t("Uploaden")}
          </Button>
        </form>

        {!items.length ? (
          <p className="text-sm text-muted-foreground">
            {t(
              "Nog geen materiaallijst geüpload. Upload een CSV of Excel-export uit Vectorworks om automatisch een eerste prijsindicatie te krijgen."
            )}
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Omschrijving")}</TableHead>
                  <TableHead>{t("Aantal")}</TableHead>
                  <TableHead>{t("Match")}</TableHead>
                  <TableHead>{t("Prijs/dag")}</TableHead>
                  <TableHead>{t("Regeltotaal")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const total = lineTotal(item, rentalMultiplier);
                  const article = item.matched_article;
                  const formId = `material-item-${item.id}`;
                  const label = article
                    ? `${article.supplier?.name ?? ""} — ${article.name}` +
                      (article.last_seen_price != null
                        ? ` · ${t("laatst gezien")} € ${article.last_seen_price.toFixed(2)}${
                            article.last_seen_price_at
                              ? ` (${new Date(article.last_seen_price_at).toLocaleDateString("nl-NL")})`
                              : ""
                          }`
                        : "")
                    : t("Geen match");
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="max-w-xs">{item.raw_description}</TableCell>
                      <TableCell>
                        <Input
                          form={formId}
                          name="quantity"
                          type="number"
                          step="0.01"
                          defaultValue={item.quantity}
                          className="h-8 w-20 text-xs"
                        />{" "}
                        {item.unit}
                      </TableCell>
                      <TableCell>
                        <MatchPicker
                          projectId={projectId}
                          stageId={stageId}
                          itemId={item.id}
                          currentLabel={label}
                          defaultQuery={item.raw_description}
                          suppliers={suppliers}
                          labels={matchPickerLabels}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          form={formId}
                          name="unit_price"
                          type="number"
                          step="0.01"
                          defaultValue={item.unit_price ?? ""}
                          placeholder="—"
                          className="h-8 w-24 text-xs"
                        />
                        {article && (
                          <label className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <input form={formId} type="checkbox" name="save_as_default" />
                            {t("ook als standaard opslaan")}
                          </label>
                        )}
                      </TableCell>
                      <TableCell>{total != null ? `€ ${total.toFixed(2)}` : "—"}</TableCell>
                      <TableCell className="space-x-1 text-right">
                        <form
                          id={formId}
                          action={updateMaterialListItem.bind(
                            null,
                            projectId,
                            stageId,
                            item.id,
                            item.matched_article_id
                          )}
                          className="inline"
                        >
                          <Button type="submit" size="sm" variant="secondary">
                            {t("Opslaan")}
                          </Button>
                        </form>
                        <form
                          action={deleteMaterialListItem.bind(null, projectId, stageId, item.id)}
                          className="inline"
                        >
                          <Button type="submit" variant="ghost" size="sm">
                            {t("Verwijderen")}
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {groups.size > 0 && (
              <div className="space-y-2 border-t pt-4">
                <p className="text-sm font-medium">{t("Eerste prijsindicatie per categorie")}</p>
                {Array.from(groups.values()).map((group) => (
                  <div
                    key={`${group.category}::${group.supplierId}`}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>
                      {t(catalogCategoryLabel(group.category))} — {group.supplierName}: {t("inkoop")}{" "}
                      <span className="font-medium">€ {group.total.toFixed(2)}</span>{" "}
                      <span className="text-muted-foreground">
                        · {t("klant (indicatief,")} {defaultMarginPercentage} {t("% marge)")}
                      </span>{" "}
                      <span className="font-medium">
                        € {(group.total * (1 + defaultMarginPercentage / 100)).toFixed(2)}
                      </span>
                    </span>
                    <form
                      action={pushMaterialListGroupToQuote.bind(
                        null,
                        projectId,
                        stageId,
                        group.category,
                        group.supplierId
                      )}
                    >
                      <Button type="submit" size="sm" variant="secondary">
                        {t("Overnemen als offerte")}
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            )}

            {lightFixtureCount > 0 && (
              <div className="space-y-1 rounded-md border border-dashed p-3 text-sm">
                <p className="font-medium">{t("Geschatte DMX-netwerkbehoefte (vuistregel)")}</p>
                <p className="text-muted-foreground">
                  {lightFixtureCount} lichtarmaturen in deze lijst → circa {estimatedUniverses}{" "}
                  DMX-universe{estimatedUniverses === 1 ? "" : "s"}, {estimatedNodes} node
                  {estimatedNodes === 1 ? "" : "s"} (4 universes/node), {estimatedSwitches}{" "}
                  netwerkswitch{estimatedSwitches === 1 ? "" : "es"} (4 nodes/switch). Controleer
                  altijd de daadwerkelijke fixture-specs en netwerktopologie — voeg de juiste
                  node/switch-modellen hieronder toe via &quot;+ Regel toevoegen&quot;.
                </p>
              </div>
            )}
          </>
        )}

        <div className="border-t pt-4">
          <AddMaterialListItem projectId={projectId} stageId={stageId} labels={addItemLabels} />
        </div>
      </CardContent>
    </Card>
  );
}
