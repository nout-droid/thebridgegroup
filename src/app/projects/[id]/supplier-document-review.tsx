"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  confirmSupplierDocument,
  dismissSupplierDocument,
  parseStoredQuoteDocument,
  type PendingDocumentLine,
} from "./supplier-review-actions";

export interface SupplierDocumentReviewLabels {
  busy: string;
  review: string;
  ignore: string;
  noLinesFound: string;
  description: string;
  amount: string;
  remove: string;
  confirm: string;
  lines: string;
  cancel: string;
}

export function SupplierDocumentReview({
  projectId,
  documentId,
  quoteId,
  label,
  labels,
}: {
  projectId: string;
  documentId: string;
  quoteId: string;
  label: string;
  labels: SupplierDocumentReviewLabels;
}) {
  const router = useRouter();
  const [lines, setLines] = useState<PendingDocumentLine[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadPreview() {
    setLoading(true);
    const parsed = await parseStoredQuoteDocument(documentId);
    setLines(parsed);
    setLoading(false);
  }

  function updateLine(index: number, patch: Partial<PendingDocumentLine>) {
    setLines((prev) => prev?.map((line, i) => (i === index ? { ...line, ...patch } : line)) ?? null);
  }

  function removeLine(index: number) {
    setLines((prev) => prev?.filter((_, i) => i !== index) ?? null);
  }

  async function confirm() {
    await confirmSupplierDocument(projectId, documentId, quoteId, lines ?? []);
    router.refresh();
  }

  async function dismiss() {
    await dismissSupplierDocument(projectId, documentId);
    router.refresh();
  }

  if (lines === null) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm">{label}</span>
        <Button type="button" size="sm" variant="secondary" onClick={loadPreview} disabled={loading}>
          {loading ? labels.busy : labels.review}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={dismiss}>
          {labels.ignore}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-sm font-medium">{label}</p>
      {lines.length === 0 && (
        <p className="text-xs text-muted-foreground">{labels.noLinesFound}</p>
      )}
      {lines.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{labels.description}</TableHead>
              <TableHead>{labels.amount}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Input
                    value={line.raw_text}
                    onChange={(e) => updateLine(index, { raw_text: e.target.value })}
                    className="h-8 text-xs"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    value={line.price}
                    onChange={(e) => updateLine(index, { price: Number(e.target.value) })}
                    className="h-8 w-24 text-xs"
                  />
                </TableCell>
                <TableCell>
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeLine(index)}>
                    {labels.remove}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={confirm}>
          {labels.confirm} ({lines.length} {labels.lines})
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setLines(null)}>
          {labels.cancel}
        </Button>
      </div>
    </div>
  );
}
