"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Supplier } from "@/lib/types";
import {
  confirmQuotePdfImportGroup,
  parseQuotePdf,
  type ParsedQuoteReviewLine,
} from "./quote-pdf-actions";

export interface QuotePdfImportLabels {
  title: string;
  description: string;
  supplier: string;
  chooseSupplier: string;
  busy: string;
  upload: string;
  noLinesFound: string;
  uploadFailed: string;
  description2: string;
  amount: string;
  category: string;
  stage: string;
  projectWide: string;
  uncategorized: string;
  noHeadingDetected: string;
  newCategory: string;
  backToList: string;
  recognizedAs: string;
  remove: string;
  confirmAsQuote: string;
  chooseSupplierFirst: string;
  confirmFailed: string;
  defaultStage: string;
  pendingPrefix: string;
  pendingLinesSuffix: string;
  confirmAllCategorized: string;
}

const CUSTOM_CATEGORY_VALUE = "__custom__";
const PROJECT_WIDE_VALUE = "__project_wide__";

function euro(value: number) {
  return `€ ${value.toFixed(2)}`;
}

export function QuotePdfImport({
  projectId,
  stageId,
  stages,
  categoryNames,
  suppliers,
  labels,
}: {
  projectId: string;
  stageId: string | null;
  stages: { id: string; name: string }[];
  categoryNames: string[];
  suppliers: Supplier[];
  labels: QuotePdfImportLabels;
}) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState("");
  const [defaultStageId, setDefaultStageId] = useState<string | null>(stageId);
  const [lines, setLines] = useState<ParsedQuoteReviewLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null);
  const [confirmingAll, setConfirmingAll] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [manualCategoryLines, setManualCategoryLines] = useState<Set<number>>(new Set());

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setLoading(true);
    setUploadError(null);
    try {
      const parsed = await parseQuotePdf(projectId, formData);
      // Regels zonder herkend podium vallen terug op het hierboven gekozen podium — dat
      // éénmalig hier oplossen i.p.v. overal een fallback te herhalen. Detectie via de
      // kopregel van de leverancier (bv. "Licht area 1") wint als die wél een podium matcht.
      setLines(parsed.map((line) => ({ ...line, stage_id: line.stage_id ?? defaultStageId })));
      setManualCategoryLines(new Set());
      if (parsed.length === 0) {
        setUploadError(labels.noLinesFound);
      }
    } catch {
      setUploadError(labels.uploadFailed);
    } finally {
      setLoading(false);
    }
  }

  function updateLine(index: number, patch: Partial<ParsedQuoteReviewLine>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function stageNameFor(id: string | null) {
    if (!id) return labels.projectWide;
    return stages.find((s) => s.id === id)?.name ?? labels.projectWide;
  }

  interface Group {
    key: string;
    category: string;
    stageId: string | null;
    heading: string | null;
    total: number;
    entries: { index: number; line: ParsedQuoteReviewLine }[];
  }

  const groups = new Map<string, Group>();
  lines.forEach((line, index) => {
    const category = line.category.trim();
    const key = category
      ? `cat:${category}|${line.stage_id ?? ""}`
      : `unc:${line.heading ?? ""}`;
    const existing = groups.get(key);
    if (existing) {
      existing.total += line.price;
      existing.entries.push({ index, line });
    } else {
      groups.set(key, {
        key,
        category,
        stageId: line.stage_id,
        heading: line.heading,
        total: line.price,
        entries: [{ index, line }],
      });
    }
  });

  const sortedGroups = Array.from(groups.values()).sort((a, b) => {
    if (!a.category && b.category) return -1;
    if (a.category && !b.category) return 1;
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return stageNameFor(a.stageId).localeCompare(stageNameFor(b.stageId));
  });

  const categorySelectOptions = Array.from(
    new Set([...categoryNames, ...lines.map((l) => l.category).filter(Boolean)])
  ).sort((a, b) => a.localeCompare(b));

  async function confirmGroup(group: Group) {
    if (!supplierId || !group.category) return;

    setConfirmError(null);
    setConfirmingKey(group.key);
    try {
      await confirmQuotePdfImportGroup(
        projectId,
        group.stageId,
        group.category,
        supplierId,
        group.entries.map((e) => e.line)
      );
      const confirmedIndexes = new Set(group.entries.map((e) => e.index));
      setLines((prev) => prev.filter((_, i) => !confirmedIndexes.has(i)));
      router.refresh();
    } catch {
      setConfirmError(labels.confirmFailed);
    } finally {
      setConfirmingKey(null);
    }
  }

  const categorizedGroups = sortedGroups.filter((g) => g.category);

  // Grote offertes splitsen al snel in 8-10 groepen die stuk voor stuk bevestigd moeten
  // worden — makkelijk om te denken dat je klaar bent terwijl er nog groepen open staan.
  // Eén knop om alle al-gecategoriseerde groepen in één keer te bevestigen voorkomt dat.
  async function confirmAllCategorized() {
    if (!supplierId || !categorizedGroups.length) return;

    setConfirmError(null);
    setConfirmingAll(true);
    try {
      const allConfirmedIndexes = new Set<number>();
      for (const group of categorizedGroups) {
        await confirmQuotePdfImportGroup(
          projectId,
          group.stageId,
          group.category,
          supplierId,
          group.entries.map((e) => e.line)
        );
        group.entries.forEach((e) => allConfirmedIndexes.add(e.index));
      }
      setLines((prev) => prev.filter((_, i) => !allConfirmedIndexes.has(i)));
      router.refresh();
    } catch {
      setConfirmError(labels.confirmFailed);
    } finally {
      setConfirmingAll(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{labels.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{labels.description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{labels.supplier}</label>
            <Select value={supplierId} onValueChange={(value) => setSupplierId(value ?? "")}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={labels.chooseSupplier} />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {stages.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{labels.defaultStage}</label>
              <Select
                value={defaultStageId ?? PROJECT_WIDE_VALUE}
                onValueChange={(value) =>
                  setDefaultStageId(value === PROJECT_WIDE_VALUE ? null : value)
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PROJECT_WIDE_VALUE}>{labels.projectWide}</SelectItem>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <form onSubmit={handleUpload} className="flex items-end gap-2">
            <Input type="file" name="file" accept=".pdf" required />
            <Button type="submit" disabled={loading}>
              {loading ? labels.busy : labels.upload}
            </Button>
          </form>
        </div>

        {uploadError && (
          <p className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
            {uploadError}
          </p>
        )}

        {!supplierId && lines.length > 0 && (
          <p className="text-xs text-muted-foreground">{labels.chooseSupplierFirst}</p>
        )}
        {confirmError && (
          <p className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
            {confirmError}
          </p>
        )}

        {lines.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/40 p-2 text-sm">
            <span>
              {labels.pendingPrefix} {lines.length} {labels.pendingLinesSuffix}{" "}
              {euro(lines.reduce((sum, line) => sum + line.price, 0))}
            </span>
            {categorizedGroups.length > 1 && (
              <Button
                type="button"
                size="sm"
                disabled={!supplierId || confirmingAll || confirmingKey !== null}
                onClick={confirmAllCategorized}
              >
                {confirmingAll ? labels.busy : labels.confirmAllCategorized}
              </Button>
            )}
          </div>
        )}

        {sortedGroups.map((group) => (
          <details key={group.key} className="group rounded-md border" open={!group.category}>
            <summary className="flex cursor-pointer select-none flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm font-medium">
              <span>
                {group.category ? (
                  <>
                    {group.category}
                    <span className="ml-1.5 font-normal text-muted-foreground">
                      · {stageNameFor(group.stageId)}
                    </span>
                  </>
                ) : (
                  <>
                    {labels.uncategorized}
                    <span className="ml-1.5 font-normal text-muted-foreground">
                      · {group.heading ?? labels.noHeadingDetected}
                    </span>
                  </>
                )}
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  ({group.entries.length})
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="font-semibold">{euro(group.total)}</span>
                {group.category && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={!supplierId || confirmingKey === group.key || confirmingAll}
                    onClick={(e) => {
                      e.preventDefault();
                      confirmGroup(group);
                    }}
                  >
                    {confirmingKey === group.key ? labels.busy : labels.confirmAsQuote}
                  </Button>
                )}
              </span>
            </summary>
            <div className="border-t p-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-7 text-xs">{labels.description2}</TableHead>
                    <TableHead className="h-7 text-xs">{labels.amount}</TableHead>
                    <TableHead className="h-7 text-xs">{labels.category}</TableHead>
                    <TableHead className="h-7 text-xs">{labels.stage}</TableHead>
                    <TableHead className="h-7" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.entries.map(({ index, line }) => (
                    <TableRow key={index}>
                      <TableCell className="max-w-xs py-1 text-xs">
                        {line.raw_text}
                        {line.matched_label && (
                          <p className="text-xs text-muted-foreground">
                            {labels.recognizedAs} {line.matched_label}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="py-1">
                        <Input
                          type="number"
                          step="0.01"
                          value={line.price}
                          onChange={(e) => updateLine(index, { price: Number(e.target.value) })}
                          className="h-8 w-24 text-xs"
                        />
                      </TableCell>
                      <TableCell className="py-1">
                        {manualCategoryLines.has(index) ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={line.category}
                              onChange={(e) => updateLine(index, { category: e.target.value })}
                              placeholder={labels.category}
                              className="h-8 w-32 text-xs"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={() =>
                                setManualCategoryLines((prev) => {
                                  const next = new Set(prev);
                                  next.delete(index);
                                  return next;
                                })
                              }
                            >
                              {labels.backToList}
                            </Button>
                          </div>
                        ) : (
                          <Select
                            value={line.category || undefined}
                            onValueChange={(value) => {
                              if (value === CUSTOM_CATEGORY_VALUE) {
                                setManualCategoryLines((prev) => new Set(prev).add(index));
                              } else {
                                updateLine(index, { category: value ?? "" });
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 w-36 text-xs">
                              <SelectValue placeholder={labels.category} />
                            </SelectTrigger>
                            <SelectContent>
                              {categorySelectOptions.map((name) => (
                                <SelectItem key={name} value={name}>
                                  {name}
                                </SelectItem>
                              ))}
                              <SelectItem value={CUSTOM_CATEGORY_VALUE}>
                                {labels.newCategory}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell className="py-1">
                        <Select
                          value={line.stage_id ?? PROJECT_WIDE_VALUE}
                          onValueChange={(value) =>
                            updateLine(index, {
                              stage_id: value === PROJECT_WIDE_VALUE ? null : value,
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={PROJECT_WIDE_VALUE}>{labels.projectWide}</SelectItem>
                            {stages.map((stage) => (
                              <SelectItem key={stage.id} value={stage.id}>
                                {stage.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="py-1 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => removeLine(index)}
                        >
                          {labels.remove}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </details>
        ))}
      </CardContent>
    </Card>
  );
}
