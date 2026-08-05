"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface FreelancerOption {
  id: string;
  name: string;
  role: string;
  home_address: string;
  day_rate: number;
  overtime_rate: number;
  km_rate: number;
  sell_day_rate: number | null;
  sell_overtime_rate: number | null;
  sell_km_rate: number | null;
}

export interface FreelancerPickerLabels {
  fromDatabase: string;
  manualEntry: string;
  name: string;
  role: string;
  homeAddress: string;
  dayRate: string;
  overtimeRate: string;
  kmRate: string;
  sellDayRate: string;
  sellOvertimeRate: string;
  sellKmRate: string;
}

// Los kiezen uit de centrale crew-database (i.p.v. steeds opnieuw naam/tarieven/adres
// intypen) hoeft alleen de standaardwaarden van deze velden voor te vullen — de gebruiker
// kan na selectie alsnog alles aanpassen voordat het formulier verstuurd wordt.
const MANUAL_VALUE = "__manual__";

export function FreelancerPicker({
  freelancers,
  defaultFreelancerId,
  defaults,
  idPrefix,
  labels,
}: {
  freelancers: FreelancerOption[];
  defaultFreelancerId?: string | null;
  defaults?: {
    name?: string;
    role?: string;
    home_address?: string;
    day_rate?: number;
    overtime_rate?: number;
    km_rate?: number;
    sell_day_rate?: number | null;
    sell_overtime_rate?: number | null;
    sell_km_rate?: number | null;
  };
  idPrefix: string;
  labels: FreelancerPickerLabels;
}) {
  const [selectedId, setSelectedId] = useState(defaultFreelancerId ?? MANUAL_VALUE);
  const [fields, setFields] = useState({
    name: defaults?.name ?? "",
    role: defaults?.role ?? "",
    home_address: defaults?.home_address ?? "",
    day_rate: defaults?.day_rate ?? 0,
    overtime_rate: defaults?.overtime_rate ?? 0,
    km_rate: defaults?.km_rate ?? 0.23,
    sell_day_rate: defaults?.sell_day_rate ?? null,
    sell_overtime_rate: defaults?.sell_overtime_rate ?? null,
    sell_km_rate: defaults?.sell_km_rate ?? null,
  });

  function handleSelect(id: string) {
    setSelectedId(id);
    if (id === MANUAL_VALUE) return;
    const freelancer = freelancers.find((f) => f.id === id);
    if (!freelancer) return;
    setFields({
      name: freelancer.name,
      role: freelancer.role,
      home_address: freelancer.home_address,
      day_rate: freelancer.day_rate,
      overtime_rate: freelancer.overtime_rate,
      km_rate: freelancer.km_rate,
      sell_day_rate: freelancer.sell_day_rate,
      sell_overtime_rate: freelancer.sell_overtime_rate,
      sell_km_rate: freelancer.sell_km_rate,
    });
  }

  return (
    <>
      {freelancers.length > 0 && (
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-freelancer`} className="text-xs">
            {labels.fromDatabase}
          </Label>
          <select
            id={`${idPrefix}-freelancer`}
            value={selectedId}
            onChange={(e) => handleSelect(e.target.value)}
            className="h-8 w-full rounded-md border bg-background px-2 text-xs"
          >
            <option value={MANUAL_VALUE}>{labels.manualEntry}</option>
            {freelancers.map((freelancer) => (
              <option key={freelancer.id} value={freelancer.id}>
                {freelancer.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <input type="hidden" name="freelancer_id" value={selectedId === MANUAL_VALUE ? "" : selectedId} />

      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-name`} className="text-xs">
          {labels.name}
        </Label>
        <Input
          id={`${idPrefix}-name`}
          name="name"
          value={fields.name}
          onChange={(e) => setFields((prev) => ({ ...prev, name: e.target.value }))}
          className="h-8 text-xs"
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-role`} className="text-xs">
          {labels.role}
        </Label>
        <Input
          id={`${idPrefix}-role`}
          name="role"
          value={fields.role}
          onChange={(e) => setFields((prev) => ({ ...prev, role: e.target.value }))}
          className="h-8 text-xs"
        />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-home-address`} className="text-xs">
          {labels.homeAddress}
        </Label>
        <Input
          id={`${idPrefix}-home-address`}
          name="home_address"
          value={fields.home_address}
          onChange={(e) => setFields((prev) => ({ ...prev, home_address: e.target.value }))}
          className="h-8 text-xs"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-day-rate`} className="text-xs">
          {labels.dayRate}
        </Label>
        <Input
          id={`${idPrefix}-day-rate`}
          name="day_rate"
          type="number"
          step="0.01"
          min="0"
          value={fields.day_rate || ""}
          onChange={(e) => setFields((prev) => ({ ...prev, day_rate: Number(e.target.value) }))}
          className="h-8 text-xs"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-ot-rate`} className="text-xs">
          {labels.overtimeRate}
        </Label>
        <Input
          id={`${idPrefix}-ot-rate`}
          name="overtime_rate"
          type="number"
          step="0.01"
          min="0"
          value={fields.overtime_rate || ""}
          onChange={(e) => setFields((prev) => ({ ...prev, overtime_rate: Number(e.target.value) }))}
          className="h-8 text-xs"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-km-rate`} className="text-xs">
          {labels.kmRate}
        </Label>
        <Input
          id={`${idPrefix}-km-rate`}
          name="km_rate"
          type="number"
          step="0.01"
          min="0"
          value={fields.km_rate}
          onChange={(e) => setFields((prev) => ({ ...prev, km_rate: Number(e.target.value) }))}
          className="h-8 text-xs"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-sell-day-rate`} className="text-xs">
          {labels.sellDayRate}
        </Label>
        <Input
          id={`${idPrefix}-sell-day-rate`}
          name="sell_day_rate"
          type="number"
          step="0.01"
          min="0"
          placeholder={fields.day_rate ? String(fields.day_rate) : undefined}
          value={fields.sell_day_rate ?? ""}
          onChange={(e) =>
            setFields((prev) => ({
              ...prev,
              sell_day_rate: e.target.value === "" ? null : Number(e.target.value),
            }))
          }
          className="h-8 text-xs"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-sell-ot-rate`} className="text-xs">
          {labels.sellOvertimeRate}
        </Label>
        <Input
          id={`${idPrefix}-sell-ot-rate`}
          name="sell_overtime_rate"
          type="number"
          step="0.01"
          min="0"
          placeholder={fields.overtime_rate ? String(fields.overtime_rate) : undefined}
          value={fields.sell_overtime_rate ?? ""}
          onChange={(e) =>
            setFields((prev) => ({
              ...prev,
              sell_overtime_rate: e.target.value === "" ? null : Number(e.target.value),
            }))
          }
          className="h-8 text-xs"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-sell-km-rate`} className="text-xs">
          {labels.sellKmRate}
        </Label>
        <Input
          id={`${idPrefix}-sell-km-rate`}
          name="sell_km_rate"
          type="number"
          step="0.01"
          min="0"
          placeholder={fields.km_rate ? String(fields.km_rate) : undefined}
          value={fields.sell_km_rate ?? ""}
          onChange={(e) =>
            setFields((prev) => ({
              ...prev,
              sell_km_rate: e.target.value === "" ? null : Number(e.target.value),
            }))
          }
          className="h-8 text-xs"
        />
      </div>
    </>
  );
}
