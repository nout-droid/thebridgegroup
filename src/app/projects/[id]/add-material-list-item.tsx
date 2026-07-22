"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { CatalogMatchSuggestion } from "@/lib/types";
import { addMaterialListItem } from "./actions";

export function AddMaterialListItem({
  projectId,
  stageId,
}: {
  projectId: string;
  stageId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [suggestions, setSuggestions] = useState<CatalogMatchSuggestion[]>([]);
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
    await addMaterialListItem(
      projectId,
      stageId,
      suggestion.article_id,
      query.trim() || suggestion.name,
      quantity,
      suggestion.day_price
    );
    setOpen(false);
    setQuery("");
    setQuantity(1);
    setSuggestions([]);
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
        + Regel toevoegen
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-md border p-2">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Zoek artikel in catalogus..."
          className="h-8 flex-1 text-xs"
        />
        <Input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value) || 1)}
          className="h-8 w-20 text-xs"
        />
        <Button type="button" size="sm" onClick={search} disabled={loading}>
          Zoek
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Annuleren
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
  );
}
