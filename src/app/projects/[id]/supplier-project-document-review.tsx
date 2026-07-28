"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  confirmSupplierProjectDocument,
  dismissSupplierProjectDocument,
  parseSupplierProjectDocument,
  type ParsedSupplierDocumentLine,
  type SupplierDocumentCategoryOption,
} from "./supplier-project-review-actions";

interface ReviewLine extends ParsedSupplierDocumentLine {
  category_id: string;
}

export interface SupplierProjectDocumentReviewLabels {
  busy: string;
  review: string;
  ignore: string;
  noCategoriesWarning: string;
  noLinesFound: string;
  description: string;
  amount: string;
  category: string;
  notAssign: string;
  recognizedAs: string;
  remove: string;
  unassignedSuffix: string;
  confirm: string;
  lines: string;
  cancel: string;
}

export function SupplierProjectDocumentReview({
  projectId,
  documentId,
  supplierId,
  label,
  labels,
}: {
  projectId: string;
  documentId: string;
  supplierId: string;
  label: string;
  labels: SupplierProjectDocumentReviewLabels;
}) {
  const router = useRouter();
  const [lines, setLines] = useState<ReviewLine[] | null>(null);
  const [categories, setCategories] = useState<SupplierDocumentCategoryOption[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadPreview() {
    setLoading(true);
    const parsed = await parseSupplierProjectDocument(documentId);
    setCategories(parsed.categories);
    setLines(
      parsed.lines.map((line) => ({ ...line, category_id: line.suggested_category_id ?? "" }))
    );
    setLoading(false);
  }

  function updateLine(index: number, patch: Partial<ReviewLine>) {
    setLines((prev) => prev?.map((line, i) => (i === index ? { ...line, ...patch } : line)) ?? null);
  }

  function removeLine(index: number) {
    setLines((prev) => prev?.filter((_, i) => i !== index) ?? null);
  }

  async function confirm() {
    await confirmSupplierProjectDocument(projectId, documentId, supplierId, lines ?? []);
    router.refresh();
  }

  async function dismiss() {
    await dismissSupplierProjectDocument(projectId, documentId);
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

  const unassignedCount = lines.filter((l) => !l.category_id).length;

  return (
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-sm font-medium">{label}</p>
      {!categories.length && (
        <p className="text-xs text-destructive">{labels.noCategoriesWarning}</p>
      )}
      {lines.length === 0 && (
        <p className="text-xs text-muted-foreground">{labels.noLinesFound}</p>
      )}
      {lines.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{labels.description}</TableHead>
              <TableHead>{labels.amount}</TableHead>
              <TableHead>{labels.category}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line, index) => (
              <TableRow key={index}>
                <TableCell className="max-w-xs">
                  {line.raw_text}
                  {line.matched_label && (
                    <p className="text-xs text-muted-foreground">
                      {labels.recognizedAs} {line.matched_label}
                    </p>
                  )}
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
                  <Select
                    value={line.category_id}
                    onValueChange={(value) => updateLine(index, { category_id: value ?? "" })}
                  >
                    <SelectTrigger className="h-8 w-40 text-xs">
                      <SelectValue placeholder={labels.notAssign} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeLine(index)}>
                    {labels.remove}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {unassignedCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {unassignedCount} {labels.unassignedSuffix}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={confirm}>
          {labels.confirm} ({lines.filter((l) => l.category_id).length} {labels.lines})
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setLines(null)}>
          {labels.cancel}
        </Button>
      </div>
    </div>
  );
}
