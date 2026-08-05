"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Category, Supplier } from "@/lib/types";
import { requestQuotesForCategories } from "./actions";

export interface RequestQuotesCardLabels {
  title: string;
  description: string;
  supplier: string;
  chooseSupplier: string;
  sendRequest: string;
  unknownStage: string;
  projectWide: string;
  lowRating: string;
}

export function RequestQuotesCard({
  projectId,
  categories,
  suppliers,
  labels,
  categoryLabels,
  stageLabels,
}: {
  projectId: string;
  categories: Category[];
  suppliers: Supplier[];
  labels: RequestQuotesCardLabels;
  categoryLabels: Record<string, string>;
  stageLabels: Record<string, string>;
}) {
  const [supplierId, setSupplierId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const groups = new Map<string, Category[]>();
  for (const category of categories) {
    const label = category.stage_id
      ? stageLabels[category.stage_id] ?? labels.unknownStage
      : labels.projectWide;
    const list = groups.get(label) ?? [];
    list.push(category);
    groups.set(label, list);
  }

  function toggle(categoryId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }

  if (!categories.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{labels.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{labels.description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{labels.supplier}</label>
          <Select value={supplierId} onValueChange={(value) => setSupplierId(value ?? "")}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder={labels.chooseSupplier} />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                  {supplier.avg_rating != null && supplier.avg_rating < 3 && (
                    <span className="ml-1 text-amber-600">
                      ⚠️ {labels.lowRating} ({supplier.avg_rating.toFixed(1)}/5)
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          {[...groups.entries()].map(([label, group]) => (
            <div key={label} className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {group.map((category) => (
                  <label key={category.id} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.has(category.id)}
                      onChange={() => toggle(category.id)}
                      className="h-4 w-4"
                    />
                    {categoryLabels[category.id] ?? category.name}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <form
          action={requestQuotesForCategories.bind(null, projectId)}
          onSubmit={() => setSelected(new Set())}
        >
          <input type="hidden" name="supplier_id" value={supplierId} />
          {[...selected].map((categoryId) => (
            <input key={categoryId} type="hidden" name="category_id" value={categoryId} />
          ))}
          <Button type="submit" size="sm" disabled={!supplierId || selected.size === 0}>
            {labels.sendRequest} ({selected.size})
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
