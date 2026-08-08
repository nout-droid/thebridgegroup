"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { generatePersonalTouchSuggestion } from "./actions";

export interface PersonalTouchButtonLabels {
  trigger: string;
  loading: string;
  unavailable: string;
}

export function PersonalTouchButton({ leadId, labels }: { leadId: string; labels: PersonalTouchButtonLabels }) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null | undefined>(undefined);

  async function handleClick() {
    setLoading(true);
    const result = await generatePersonalTouchSuggestion(leadId);
    setSuggestion(result);
    setLoading(false);
  }

  return (
    <div className="space-y-1.5">
      <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={handleClick} disabled={loading}>
        {loading ? labels.loading : labels.trigger}
      </Button>
      {suggestion !== undefined && (
        <p className="rounded-md border bg-muted/40 p-2 text-xs whitespace-pre-line">
          {suggestion ?? labels.unavailable}
        </p>
      )}
    </div>
  );
}
