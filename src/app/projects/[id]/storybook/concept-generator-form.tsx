"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { generateStorybookConceptSuggestion } from "./storybook-actions";
import type { StorybookConcept } from "@/lib/server/storybook-concept";

export interface ConceptGeneratorLabels {
  heading: string;
  briefPlaceholder: string;
  generate: string;
  generating: string;
  titleLabel: string;
  descriptionLabel: string;
  keywordsLabel: string;
}

export function ConceptGeneratorForm({ labels }: { labels: ConceptGeneratorLabels }) {
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
      <p className="text-xs font-medium text-muted-foreground">{labels.heading}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder={labels.briefPlaceholder}
          className="max-w-xs"
        />
        <Button type="button" size="sm" variant="outline" onClick={generate} disabled={loading}>
          {loading ? labels.generating : labels.generate}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {result && (
        <div className="space-y-1 rounded-md bg-muted/50 p-2 text-xs">
          <p>
            <span className="font-medium">{labels.titleLabel}: </span>
            {result.title}
          </p>
          <p>
            <span className="font-medium">{labels.descriptionLabel}: </span>
            {result.description}
          </p>
          <p>
            <span className="font-medium">{labels.keywordsLabel}: </span>
            {result.keywords}
          </p>
        </div>
      )}
    </div>
  );
}
