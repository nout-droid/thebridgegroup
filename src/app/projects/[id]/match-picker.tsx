"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATALOG_CATEGORY_LABELS, type CatalogMatchSuggestion, type Supplier } from "@/lib/types";
import { SupplierSelect } from "./supplier-select";
import { createCatalogArticleAndMatch, updateMaterialListMatch } from "./actions";

export function MatchPicker({
  projectId,
  stageId,
  itemId,
  currentLabel,
  defaultQuery,
  suppliers,
}: {
  projectId: string;
  stageId: string | null;
  itemId: string;
  currentLabel: string;
  defaultQuery: string;
  suppliers: Supplier[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultQuery);
  const [suggestions, setSuggestions] = useState<CatalogMatchSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showNewArticle, setShowNewArticle] = useState(false);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.rpc("suggest_catalog_matches", {
      p_description: query,
      p_limit: 8,
    });
    setSuggestions((data as CatalogMatchSuggestion[]) ?? []);
    setSearched(true);
    setLoading(false);
  }

  async function pick(suggestion: CatalogMatchSuggestion) {
    await updateMaterialListMatch(projectId, stageId, itemId, suggestion.article_id, suggestion.day_price);
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-sm">{currentLabel}</span>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen((o) => !o)}>
          Wijzig
        </Button>
      </div>
      {open && (
        <div className="space-y-2 rounded-md border p-2">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Zoek artikel..."
              className="h-8 text-xs"
            />
            <Button type="button" size="sm" onClick={search} disabled={loading}>
              Zoek
            </Button>
          </div>
          {suggestions.length > 0 && (
            <ul className="space-y-1">
              {suggestions.map((suggestion) => (
                <li key={suggestion.article_id}>
                  <button
                    type="button"
                    onClick={() => pick(suggestion)}
                    className="w-full rounded px-2 py-1 text-left text-xs hover:bg-muted"
                  >
                    {suggestion.supplier_name} &mdash; {suggestion.name} (&euro;{" "}
                    {suggestion.day_price.toFixed(2)})
                    {suggestion.last_seen_price != null && (
                      <span className="text-muted-foreground">
                        {" "}
                        · laatst gezien &euro; {suggestion.last_seen_price.toFixed(2)}
                        {suggestion.last_seen_price_at &&
                          ` (${new Date(suggestion.last_seen_price_at).toLocaleDateString("nl-NL")})`}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {searched && suggestions.length === 0 && !showNewArticle && (
            <p className="text-xs text-muted-foreground">
              Niets gevonden.{" "}
              <button
                type="button"
                onClick={() => setShowNewArticle(true)}
                className="text-primary underline"
              >
                Nieuw artikel toevoegen
              </button>
            </p>
          )}
          {!showNewArticle && searched && suggestions.length > 0 && (
            <button
              type="button"
              onClick={() => setShowNewArticle(true)}
              className="text-xs text-primary underline"
            >
              Niet het juiste artikel? Nieuw artikel toevoegen
            </button>
          )}
          {showNewArticle && (
            <form
              action={async (formData) => {
                await createCatalogArticleAndMatch(projectId, stageId, itemId, formData);
                setOpen(false);
                router.refresh();
              }}
              className="space-y-2 rounded-md border border-dashed p-2"
            >
              <Input
                name="name"
                defaultValue={defaultQuery}
                placeholder="Artikelnaam"
                className="h-8 text-xs"
                required
              />
              <SupplierSelect id={`new-article-supplier-${itemId}`} suppliers={suppliers} />
              <Select name="category" items={Object.entries(CATALOG_CATEGORY_LABELS).map(([value, label]) => ({ value, label }))}>
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue placeholder="Categorie" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATALOG_CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                name="day_price"
                type="number"
                step="0.01"
                placeholder="Prijs per dag (€)"
                className="h-8 text-xs"
                required
              />
              <Button type="submit" size="sm">
                Toevoegen &amp; koppelen
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
