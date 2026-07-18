"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { XIcon } from "lucide-react";

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  });
}

export function AccessDatesInput({
  name = "access_dates",
  defaultValues = [],
}: {
  name?: string;
  defaultValues?: string[];
}) {
  const [dates, setDates] = useState<string[]>([...defaultValues].sort());
  const [draft, setDraft] = useState("");

  function addDate() {
    if (!draft || dates.includes(draft)) return;
    setDates((prev) => [...prev, draft].sort());
    setDraft("");
  }

  function removeDate(date: string) {
    setDates((prev) => prev.filter((d) => d !== date));
  }

  return (
    <div className="space-y-1.5">
      {dates.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {dates.map((date) => (
            <Badge key={date} variant="secondary" className="gap-1 pr-1">
              <input type="hidden" name={name} value={date} />
              {formatDate(date)}
              <button
                type="button"
                onClick={() => removeDate(date)}
                className="rounded-full hover:bg-black/10"
              >
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="h-8 text-xs"
        />
        <Button type="button" size="sm" variant="outline" className="h-8 shrink-0 text-xs" onClick={addDate}>
          Dag toevoegen
        </Button>
      </div>
      {dates.length === 0 && (
        <p className="text-xs text-muted-foreground">Geen dagen ingesteld = toegang alle dagen.</p>
      )}
    </div>
  );
}
