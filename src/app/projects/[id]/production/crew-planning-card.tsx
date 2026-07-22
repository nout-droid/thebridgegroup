"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { CrewMember, CrewPosition, Stage, Supplier } from "@/lib/types";
import { SupplierSelect } from "../supplier-select";
import { StageSelect } from "../stage-select";
import { addCrewPosition, deleteCrewPosition, updateCrewPosition } from "./crew-planning-actions";

function PositionForm({
  projectId,
  position,
  suppliers,
  stages,
  defaultDate,
  defaultStageId,
}: {
  projectId: string;
  position?: CrewPosition;
  suppliers: Supplier[];
  stages: Stage[];
  defaultDate?: string;
  defaultStageId?: string;
}) {
  const action = position
    ? updateCrewPosition.bind(null, projectId, position.id)
    : addCrewPosition.bind(null, projectId);
  const idPrefix = position?.id ?? `new-${defaultStageId ?? "algemeen"}-${defaultDate ?? "algemeen"}`;

  return (
    <form action={action} className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-4">
      <div className="space-y-1">
        <Label htmlFor={`stage-${idPrefix}`} className="text-xs">Podium/area</Label>
        <StageSelect
          id={`stage-${idPrefix}`}
          defaultValue={position?.stage_id ?? defaultStageId}
          stages={stages}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`date-${idPrefix}`} className="text-xs">Datum</Label>
        <Input
          id={`date-${idPrefix}`}
          name="work_date"
          type="date"
          defaultValue={position?.work_date ?? defaultDate}
          className="h-8 text-xs"
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`role-${idPrefix}`} className="text-xs">Functie</Label>
        <Input
          id={`role-${idPrefix}`}
          name="role"
          defaultValue={position?.role}
          placeholder="bv. Podiumtechnicus"
          className="h-8 text-xs"
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`qty-${idPrefix}`} className="text-xs">Aantal</Label>
        <Input
          id={`qty-${idPrefix}`}
          name="quantity"
          type="number"
          min={1}
          defaultValue={position?.quantity ?? 1}
          className="h-8 text-xs"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`provider-${idPrefix}`} className="text-xs">Wie levert</Label>
        <select
          id={`provider-${idPrefix}`}
          name="provided_by"
          defaultValue={position?.provided_by ?? "wij"}
          className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs"
        >
          <option value="wij">Wij</option>
          <option value="klant">Klant</option>
          <option value="leverancier">Leverancier</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`supplier-${idPrefix}`} className="text-xs">Leverancier</Label>
        <SupplierSelect
          id={`supplier-${idPrefix}`}
          defaultValue={position?.supplier_id ?? undefined}
          suppliers={suppliers}
        />
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            name="needs_accreditation"
            defaultChecked={position?.needs_accreditation}
            className="h-4 w-4"
          />
          Accreditatie nodig
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            name="needs_catering"
            defaultChecked={position?.needs_catering}
            className="h-4 w-4"
          />
          Catering nodig
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            name="needs_hotel"
            defaultChecked={position?.needs_hotel}
            className="h-4 w-4"
          />
          Hotel nodig
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            name="needs_flight"
            defaultChecked={position?.needs_flight}
            className="h-4 w-4"
          />
          Vlucht nodig
        </label>
      </div>
      <div className="space-y-1 sm:col-span-4">
        <Label htmlFor={`notes-${idPrefix}`} className="text-xs">Notities</Label>
        <Input id={`notes-${idPrefix}`} name="notes" defaultValue={position?.notes} className="h-8 text-xs" />
      </div>
      <div className="flex items-end gap-2 sm:col-span-4">
        <Button type="submit" size="sm" className="h-8 text-xs">
          {position ? "Opslaan" : "Toevoegen"}
        </Button>
        {position && (
          <Button
            type="submit"
            formAction={deleteCrewPosition.bind(null, projectId, position.id)}
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
          >
            Verwijderen
          </Button>
        )}
      </div>
    </form>
  );
}

export function CrewPlanningCard({
  projectId,
  positions,
  suppliers,
  stages,
  linkedMembers,
}: {
  projectId: string;
  positions: CrewPosition[];
  suppliers: Supplier[];
  stages: Stage[];
  linkedMembers: CrewMember[];
}) {
  const stageGroups = [
    { stageId: null as string | null, stageName: "Projectbreed" },
    ...stages.map((s) => ({ stageId: s.id, stageName: s.name })),
  ];

  const allDates = [...new Set(positions.map((p) => p.work_date))].sort();
  const [areaFilter, setAreaFilter] = useState("alle");
  const [dateFilter, setDateFilter] = useState("alle");
  const [search, setSearch] = useState("");

  const filteredPositions = positions.filter((position) => {
    if (areaFilter !== "alle" && (position.stage_id ?? "algemeen") !== areaFilter) return false;
    if (dateFilter !== "alle" && position.work_date !== dateFilter) return false;
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      const matchesRole = position.role.toLowerCase().includes(query);
      const matchesPerson = linkedMembers.some(
        (m) => m.crew_position_id === position.id && m.name.toLowerCase().includes(query)
      );
      if (!matchesRole && !matchesPerson) return false;
    }
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Crew Planning per podium/area</CardTitle>
        <p className="text-sm text-muted-foreground">
          Leg per podium, dag en functie vast hoeveel mensen nodig zijn en wie ze levert —
          nog zonder namen. Vink "Accreditatie nodig" aan om automatisch lege plekken in
          Crew & Accreditatie aan te maken zodra dit bekend wordt.
        </p>
        <div className="flex flex-wrap items-end gap-2 pt-2">
          <div className="space-y-1">
            <Label htmlFor="planning-filter-area" className="text-xs">Podium/area</Label>
            <select
              id="planning-filter-area"
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
            <Label htmlFor="planning-filter-date" className="text-xs">Datum</Label>
            <select
              id="planning-filter-date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
            >
              <option value="alle">Alle datums</option>
              {allDates.map((date) => (
                <option key={date} value={date}>{date}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="planning-filter-search" className="text-xs">Zoek op functie/naam</Label>
            <Input
              id="planning-filter-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="bv. Podiumtechnicus"
              className="h-8 w-48 text-xs"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {stageGroups.map(({ stageId, stageName }) => {
          const stagePositions = filteredPositions.filter((p) => p.stage_id === stageId);
          if (!stagePositions.length) return null;
          const dates = [...new Set(stagePositions.map((p) => p.work_date))].sort();

          return (
            <div key={stageId ?? "algemeen"} className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {stageName}
              </p>
              {dates.map((date) => {
                const dayPositions = stagePositions.filter((p) => p.work_date === date);
                const positionIds = new Set(dayPositions.map((p) => p.id));
                const dayMembers = linkedMembers.filter(
                  (m) => m.crew_position_id && positionIds.has(m.crew_position_id)
                );
                const filled = dayMembers.filter((m) => m.name).length;
                const catering = dayMembers.filter((m) => m.needs_catering).length;
                const hotel = dayMembers.filter((m) => m.needs_hotel).length;

                return (
                  <div key={date} className="space-y-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-1">
                      <p className="font-medium">{date}</p>
                      {dayMembers.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {filled} van {dayMembers.length} functies ingevuld · {catering} catering · {hotel} hotel
                        </p>
                      )}
                    </div>
                    {dayPositions.map((position) => (
                      <PositionForm
                        key={position.id}
                        projectId={projectId}
                        position={position}
                        suppliers={suppliers}
                        stages={stages}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}

        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">Nieuwe positie toevoegen</p>
          <PositionForm projectId={projectId} suppliers={suppliers} stages={stages} />
        </div>
      </CardContent>
    </Card>
  );
}
