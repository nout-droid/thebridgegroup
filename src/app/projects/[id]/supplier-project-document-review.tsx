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

export function SupplierProjectDocumentReview({
  projectId,
  documentId,
  supplierId,
  label,
}: {
  projectId: string;
  documentId: string;
  supplierId: string;
  label: string;
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
          {loading ? "Bezig..." : "Doorlopen"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={dismiss}>
          Negeren
        </Button>
      </div>
    );
  }

  const unassignedCount = lines.filter((l) => !l.category_id).length;

  return (
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-sm font-medium">{label}</p>
      {!categories.length && (
        <p className="text-xs text-destructive">
          Deze leverancier is nog voor geen enkele categorie in dit project aangevraagd — er is
          niets om aan toe te wijzen.
        </p>
      )}
      {lines.length === 0 && (
        <p className="text-xs text-muted-foreground">Geen regels herkend in dit PDF.</p>
      )}
      {lines.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Omschrijving</TableHead>
              <TableHead>Bedrag</TableHead>
              <TableHead>Categorie</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line, index) => (
              <TableRow key={index}>
                <TableCell className="max-w-xs">
                  {line.raw_text}
                  {line.matched_label && (
                    <p className="text-xs text-muted-foreground">Herkend als: {line.matched_label}</p>
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
                      <SelectValue placeholder="Niet toewijzen" />
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
                    Verwijderen
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {unassignedCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {unassignedCount} regel(s) zonder categorie worden niet overgenomen.
        </p>
      )}
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={confirm}>
          Bevestigen ({lines.filter((l) => l.category_id).length} regels)
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setLines(null)}>
          Annuleren
        </Button>
      </div>
    </div>
  );
}
