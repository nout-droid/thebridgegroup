"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { EquipmentReservation, Stage, Supplier } from "@/lib/types";
import { SupplierSelect } from "../supplier-select";
import { StageSelect } from "../stage-select";
import {
  addEquipmentReservation,
  deleteEquipmentReservation,
  updateEquipmentReservation,
} from "./equipment-actions";

export function EquipmentCard({
  projectId,
  reservations,
  suppliers,
  stages,
}: {
  projectId: string;
  reservations: EquipmentReservation[];
  suppliers: Supplier[];
  stages: Stage[];
}) {
  const [areaFilter, setAreaFilter] = useState("alle");
  const [supplierFilter, setSupplierFilter] = useState("alle");
  const [dateFilter, setDateFilter] = useState("alle");
  const [search, setSearch] = useState("");

  const dates = [...new Set(reservations.map((r) => r.reservation_date).filter((d): d is string => !!d))].sort();

  const filtered = reservations.filter((item) => {
    if (areaFilter !== "alle" && (item.stage_id ?? "algemeen") !== areaFilter) return false;
    if (supplierFilter !== "alle" && (item.supplier_id ?? "") !== supplierFilter) return false;
    if (dateFilter !== "alle" && item.reservation_date !== dateFilter) return false;
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      const matches =
        item.key_holder.toLowerCase().includes(query) ||
        item.machine_type.toLowerCase().includes(query);
      if (!matches) return false;
    }
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Materieel reservering</CardTitle>
        <p className="text-sm text-muted-foreground">
          Gehuurde machines: van wie, wanneer, en waar ligt de sleutel.
        </p>
        <div className="flex flex-wrap items-end gap-2 pt-2">
          <div className="space-y-1">
            <Label htmlFor="equip-filter-area" className="text-xs">Podium/area</Label>
            <select
              id="equip-filter-area"
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
            >
              <option value="alle">Alle podia</option>
              <option value="algemeen">Projectbreed</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="equip-filter-date" className="text-xs">Datum</Label>
            <select
              id="equip-filter-date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
            >
              <option value="alle">Alle datums</option>
              {dates.map((date) => (
                <option key={date} value={date}>{date}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="equip-filter-supplier" className="text-xs">Leverancier</Label>
            <select
              id="equip-filter-supplier"
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
            >
              <option value="alle">Alle leveranciers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="equip-filter-search" className="text-xs">Zoek op type/sleutelhouder</Label>
            <Input
              id="equip-filter-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="bv. Manitou"
              className="h-8 w-48 text-xs"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {reservations.length > 0 && (
          <a
            href={`/projects/${projectId}/production/materieel/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary underline"
          >
            Materieellijst downloaden (PDF)
          </a>
        )}
        {filtered.map((item) => (
          <form
            key={item.id}
            action={updateEquipmentReservation.bind(null, projectId, item.id)}
            className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-6"
          >
            <div className="space-y-1">
              <Label htmlFor={`type-${item.id}`} className="text-xs">Type machine</Label>
              <Input
                id={`type-${item.id}`}
                name="machine_type"
                defaultValue={item.machine_type}
                className="h-8 text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`stage-${item.id}`} className="text-xs">Podium/area</Label>
              <StageSelect
                id={`stage-${item.id}`}
                defaultValue={item.stage_id ?? undefined}
                stages={stages}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`supplier-${item.id}`} className="text-xs">Leverancier</Label>
              <SupplierSelect
                id={`supplier-${item.id}`}
                defaultValue={item.supplier_id ?? undefined}
                suppliers={suppliers}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`qty-${item.id}`} className="text-xs">Aantal</Label>
              <Input
                id={`qty-${item.id}`}
                name="quantity"
                type="number"
                min={1}
                defaultValue={item.quantity}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`acc-${item.id}`} className="text-xs">Accessoires</Label>
              <Input
                id={`acc-${item.id}`}
                name="accessories"
                defaultValue={item.accessories}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`date-${item.id}`} className="text-xs">Datum reservering</Label>
              <Input
                id={`date-${item.id}`}
                name="reservation_date"
                type="date"
                defaultValue={item.reservation_date ?? ""}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`duration-${item.id}`} className="text-xs">Benodigde duur</Label>
              <Input
                id={`duration-${item.id}`}
                name="duration"
                defaultValue={item.duration}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`num-${item.id}`} className="text-xs">Machinenummer</Label>
              <Input
                id={`num-${item.id}`}
                name="machine_number"
                defaultValue={item.machine_number}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`key-${item.id}`} className="text-xs">Sleutel bij</Label>
              <Input
                id={`key-${item.id}`}
                name="key_holder"
                defaultValue={item.key_holder}
                className="h-8 text-xs"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  name="picked_up"
                  defaultChecked={item.picked_up}
                  className="h-4 w-4"
                />
                Opgehaald
              </label>
            </div>
            <div className="flex items-end gap-2 sm:col-span-6">
              <Button type="submit" size="sm" className="h-8 text-xs">
                Opslaan
              </Button>
              <Button
                type="submit"
                formAction={deleteEquipmentReservation.bind(null, projectId, item.id)}
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
              >
                Verwijderen
              </Button>
            </div>
          </form>
        ))}

        <form
          action={addEquipmentReservation.bind(null, projectId)}
          className="grid grid-cols-2 gap-2 border-t pt-4 sm:grid-cols-6"
        >
          <div className="space-y-1">
            <Label htmlFor="new-type" className="text-xs">Type machine</Label>
            <Input id="new-type" name="machine_type" placeholder="bv. Manitou" className="h-8 text-xs" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-stage" className="text-xs">Podium/area</Label>
            <StageSelect id="new-stage" stages={stages} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-supplier" className="text-xs">Leverancier</Label>
            <SupplierSelect id="new-supplier" suppliers={suppliers} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-qty" className="text-xs">Aantal</Label>
            <Input id="new-qty" name="quantity" type="number" min={1} defaultValue={1} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-acc" className="text-xs">Accessoires</Label>
            <Input id="new-acc" name="accessories" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-date" className="text-xs">Datum reservering</Label>
            <Input id="new-date" name="reservation_date" type="date" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-duration" className="text-xs">Benodigde duur</Label>
            <Input id="new-duration" name="duration" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-num" className="text-xs">Machinenummer</Label>
            <Input id="new-num" name="machine_number" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-key" className="text-xs">Sleutel bij</Label>
            <Input id="new-key" name="key_holder" className="h-8 text-xs" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" name="picked_up" className="h-4 w-4" />
              Opgehaald
            </label>
          </div>
          <div className="sm:col-span-6">
            <Button type="submit" size="sm" className="h-8 text-xs">
              Reservering toevoegen
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
