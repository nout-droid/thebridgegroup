"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { generateStorybookConceptSuggestion } from "./storybook-actions";
import type { StorybookConcept } from "@/lib/server/storybook-concept";
import type { Translator } from "@/lib/server/translate";

export function ConceptGeneratorForm({ t }: { t: Translator }) {
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StorybookConcept | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!brief.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const response = await generateStorybookConceptSuggestion(brief);
    setLoading(false);
    if (response.error) {
      setError(response.error);
      return;
    }
    if (response.concept) setResult(response.concept);
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed p-3">
      <p className="text-xs font-medium text-muted-foreground">{t("AI-conceptgenerator")}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder={t("bv. stoer, industrieel, warm licht")}
          className="max-w-xs"
        />
        <Button type="button" size="sm" variant="outline" onClick={generate} disabled={loading}>
          {loading ? t("Bezig...") : t("Suggestie genereren")}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {result && (
        <div className="space-y-1 rounded-md bg-muted/50 p-2 text-xs">
          <p>
            <span className="font-medium">{t("Titel")}: </span>
            {result.title}
          </p>
          <p>
            <span className="font-medium">{t("Beschrijving")}: </span>
            {result.description}
          </p>
          <p>
            <span className="font-medium">{t("Stijlwoorden/kleuren")}: </span>
            {result.keywords}
          </p>
        </div>
      )}
    </div>
  );
}
