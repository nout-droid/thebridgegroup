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

export function QuotePdfImport({
  projectId,
  stageId,
  suppliers,
}: {
  projectId: string;
  stageId: string | null;
  suppliers: Supplier[];
}) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState<ParsedQuoteReviewLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [confirmingCategory, setConfirmingCategory] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  async function handleUpload(formData: FormData) {
    setLoading(true);
    setUploadError(null);
    try {
      const parsed = await parseQuotePdf(formData);
      setLines(parsed);
      if (parsed.length === 0) {
        setUploadError(
          "Geen regels met bedragen gevonden in dit PDF-bestand. Mogelijk bevat het een gescande afbeelding zonder tekstlaag, of staan bedragen in een formaat dat niet herkend wordt."
        );
      }
    } catch {
      setUploadError("Uploaden mislukt. Controleer of het bestand een geldig PDF-bestand is en probeer het opnieuw.");
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

  const groups = new Map<string, { total: number; lines: ParsedQuoteReviewLine[] }>();
  for (const line of lines) {
    const key = line.category.trim();
    if (!key) continue;
    const existing = groups.get(key);
    if (existing) {
      existing.total += line.price;
      existing.lines.push(line);
    } else {
      groups.set(key, { total: line.price, lines: [line] });
    }
  }

  async function confirmGroup(category: string) {
    if (!supplierId) return;
    const group = groups.get(category);
    if (!group) return;

    setConfirmError(null);
    setConfirmingCategory(category);
    try {
      await confirmQuotePdfImportGroup(projectId, stageId, category, supplierId, group.lines);
      setLines((prev) => prev.filter((line) => line.category.trim() !== category));
      router.refresh();
    } catch {
      setConfirmError("Overnemen als offerte is mislukt. Probeer het opnieuw.");
    } finally {
      setConfirmingCategory(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Offerte-PDF importeren</CardTitle>
        <p className="text-sm text-muted-foreground">
          Upload een offerte-PDF van een leverancier. Regels worden gekoppeld aan een categorie op
          basis van eerdere matches en de catalogus — controleer en corrigeer voordat je overneemt.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Leverancier</label>
            <Select value={supplierId} onValueChange={(value) => setSupplierId(value ?? "")}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Kies leverancier" />
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
          <form action={handleUpload} className="flex items-end gap-2">
            <Input type="file" name="file" accept=".pdf" required />
            <Button type="submit" disabled={loading}>
              {loading ? "Bezig..." : "Uploaden"}
            </Button>
          </form>
        </div>

        {uploadError && (
          <p className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
            {uploadError}
          </p>
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
                      <p className="text-xs text-muted-foreground">
                        Herkend als: {line.matched_label}
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
                    <Input
                      value={line.category}
                      onChange={(e) => updateLine(index, { category: e.target.value })}
                      placeholder="Categorie"
                      className="h-8 w-32 text-xs"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLine(index)}
                    >
                      Verwijderen
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {groups.size > 0 && (
          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-medium">Klaar om over te nemen</p>
            {Array.from(groups.entries()).map(([category, group]) => (
              <div key={category} className="flex items-center justify-between text-sm">
                <span>
                  {category}: <span className="font-medium">€ {group.total.toFixed(2)}</span>{" "}
                  <span className="text-muted-foreground">({group.lines.length} regels)</span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!supplierId || confirmingCategory === category}
                  onClick={() => confirmGroup(category)}
                >
                  {confirmingCategory === category ? "Bezig..." : "Overnemen als offerte"}
                </Button>
              </div>
            ))}
            {!supplierId && (
              <p className="text-xs text-muted-foreground">Kies eerst een leverancier hierboven.</p>
            )}
            {confirmError && (
              <p className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
                {confirmError}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
