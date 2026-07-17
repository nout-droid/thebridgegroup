"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { CatalogMatchSuggestion } from "@/lib/types";
import { updateMaterialListMatch } from "./actions";

export function MatchPicker({
  projectId,
  itemId,
  currentLabel,
  defaultQuery,
}: {
  projectId: string;
  itemId: string;
  currentLabel: string;
  defaultQuery: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultQuery);
  const [suggestions, setSuggestions] = useState<CatalogMatchSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.rpc("suggest_catalog_matches", {
      p_description: query,
      p_limit: 8,
    });
    setSuggestions((data as CatalogMatchSuggestion[]) ?? []);
    setLoading(false);
  }

  async function pick(suggestion: CatalogMatchSuggestion) {
    await updateMaterialListMatch(projectId, itemId, suggestion.article_id, suggestion.day_price);
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
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
