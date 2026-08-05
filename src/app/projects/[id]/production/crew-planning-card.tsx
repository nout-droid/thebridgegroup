"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { CrewMember, CrewPosition, Stage, Supplier } from "@/lib/types";
import { SupplierSelect } from "../supplier-select";
import { StageSelect } from "../stage-select";
import { addCrewPosition, deleteCrewPosition, savePositionMember, unlinkCrewPosition, updateCrewPosition } from "./crew-planning-actions";
import { FreelancerPicker, type FreelancerOption } from "./freelancer-picker";

export interface CrewPlanningCardLabels {
  title: string;
  description: string;
  area: string;
  allStages: string;
  projectWide: string;
  date: string;
  allDates: string;
  searchRoleName: string;
  searchPlaceholder: string;
  stage: string;
  role: string;
  rolePlaceholder: string;
  quantity: string;
  providedBy: string;
  providedByUs: string;
  providedByClient: string;
  providedBySupplier: string;
  supplier: string;
  needsAccreditation: string;
  needsCatering: string;
  needsHotel: string;
  needsFlight: string;
  notes: string;
  save: string;
  add: string;
  remove: string;
  ofPositionsFilled: string;
  positionsFilled: string;
  catering: string;
  hotel: string;
  addNewPosition: string;
  chooseStage: string;
  chooseSupplier: string;
  linkedPeople: string;
  fromDatabase: string;
  manualEntry: string;
  name: string;
  homeAddress: string;
  dayRate: string;
  overtimeRate: string;
  kmRate: string;
  sellDayRate: string;
  sellOvertimeRate: string;
  sellKmRate: string;
  savePerson: string;
  unlink: string;
}

function PositionMemberForm({
  projectId,
  member,
  freelancers,
  labels,
}: {
  projectId: string;
  member: CrewMember;
  freelancers: FreelancerOption[];
  labels: CrewPlanningCardLabels;
}) {
  const pickerLabels = {
    fromDatabase: labels.fromDatabase,
    manualEntry: labels.manualEntry,
    name: labels.name,
    role: labels.role,
    homeAddress: labels.homeAddress,
    dayRate: labels.dayRate,
    overtimeRate: labels.overtimeRate,
    kmRate: labels.kmRate,
    sellDayRate: labels.sellDayRate,
    sellOvertimeRate: labels.sellOvertimeRate,
    sellKmRate: labels.sellKmRate,
  };

  return (
    <form
      action={savePositionMember.bind(null, projectId, member.id)}
      className="grid grid-cols-2 gap-2 rounded-md border border-dashed p-2.5 sm:grid-cols-5"
    >
      <FreelancerPicker
        freelancers={freelancers}
        defaultFreelancerId={member.freelancer_id}
        defaults={{
          name: member.name,
          role: member.role,
          home_address: member.home_address,
          day_rate: member.day_rate,
          overtime_rate: member.overtime_rate,
          km_rate: member.km_rate,
          sell_day_rate: member.sell_day_rate,
          sell_overtime_rate: member.sell_overtime_rate,
          sell_km_rate: member.sell_km_rate,
        }}
        idPrefix={`member-${member.id}`}
        labels={pickerLabels}
      />
      <div className="flex items-end gap-2 sm:col-span-5">
        <Button type="submit" size="sm" className="h-8 text-xs">
          {labels.savePerson}
        </Button>
        {member.name && (
          <Button
            type="submit"
            formAction={unlinkCrewPosition.bind(null, projectId, member.id)}
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
          >
            {labels.unlink}
          </Button>
        )}
      </div>
    </form>
  );
}

function PositionForm({
  projectId,
  position,
  suppliers,
  stages,
  defaultDate,
  defaultStageId,
  labels,
}: {
  projectId: string;
  position?: CrewPosition;
  suppliers: Supplier[];
  stages: Stage[];
  defaultDate?: string;
  defaultStageId?: string;
  labels: CrewPlanningCardLabels;
}) {
  const action = position
    ? updateCrewPosition.bind(null, projectId, position.id)
    : addCrewPosition.bind(null, projectId);
  const idPrefix = position?.id ?? `new-${defaultStageId ?? "algemeen"}-${defaultDate ?? "algemeen"}`;

  return (
    <form action={action} className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-4">
      <div className="space-y-1">
        <Label htmlFor={`stage-${idPrefix}`} className="text-xs">{labels.area}</Label>
        <StageSelect
          id={`stage-${idPrefix}`}
          defaultValue={position?.stage_id ?? defaultStageId}
          stages={stages}
          placeholder={labels.chooseStage}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`date-${idPrefix}`} className="text-xs">{labels.date}</Label>
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
        <Label htmlFor={`role-${idPrefix}`} className="text-xs">{labels.role}</Label>
        <Input
          id={`role-${idPrefix}`}
          name="role"
          defaultValue={position?.role}
          placeholder={labels.rolePlaceholder}
          className="h-8 text-xs"
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`qty-${idPrefix}`} className="text-xs">{labels.quantity}</Label>
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
        <Label htmlFor={`provider-${idPrefix}`} className="text-xs">{labels.providedBy}</Label>
        <select
          id={`provider-${idPrefix}`}
          name="provided_by"
          defaultValue={position?.provided_by ?? "wij"}
          className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs"
        >
          <option value="wij">{labels.providedByUs}</option>
          <option value="klant">{labels.providedByClient}</option>
          <option value="leverancier">{labels.providedBySupplier}</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`supplier-${idPrefix}`} className="text-xs">{labels.supplier}</Label>
        <SupplierSelect
          id={`supplier-${idPrefix}`}
          defaultValue={position?.supplier_id ?? undefined}
          suppliers={suppliers}
          placeholder={labels.chooseSupplier}
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
          {labels.needsAccreditation}
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            name="needs_catering"
            defaultChecked={position?.needs_catering}
            className="h-4 w-4"
          />
          {labels.needsCatering}
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            name="needs_hotel"
            defaultChecked={position?.needs_hotel}
            className="h-4 w-4"
          />
          {labels.needsHotel}
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            name="needs_flight"
            defaultChecked={position?.needs_flight}
            className="h-4 w-4"
          />
          {labels.needsFlight}
        </label>
      </div>
      <div className="space-y-1 sm:col-span-4">
        <Label htmlFor={`notes-${idPrefix}`} className="text-xs">{labels.notes}</Label>
        <Input id={`notes-${idPrefix}`} name="notes" defaultValue={position?.notes} className="h-8 text-xs" />
      </div>
      <div className="flex items-end gap-2 sm:col-span-4">
        <Button type="submit" size="sm" className="h-8 text-xs">
          {position ? labels.save : labels.add}
        </Button>
        {position && (
          <Button
            type="submit"
            formAction={deleteCrewPosition.bind(null, projectId, position.id)}
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
          >
            {labels.remove}
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
  freelancers,
  labels,
}: {
  projectId: string;
  positions: CrewPosition[];
  suppliers: Supplier[];
  stages: Stage[];
  linkedMembers: CrewMember[];
  freelancers: FreelancerOption[];
  labels: CrewPlanningCardLabels;
}) {
  const stageGroups = [
    { stageId: null as string | null, stageName: labels.projectWide },
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
        <CardTitle className="text-base">{labels.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{labels.description}</p>
        <div className="flex flex-wrap items-end gap-2 pt-2">
          <div className="space-y-1">
            <Label htmlFor="planning-filter-area" className="text-xs">{labels.area}</Label>
            <select
              id="planning-filter-area"
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
            >
              <option value="alle">{labels.allStages}</option>
              <option value="algemeen">{labels.projectWide}</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="planning-filter-date" className="text-xs">{labels.date}</Label>
            <select
              id="planning-filter-date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
            >
              <option value="alle">{labels.allDates}</option>
              {allDates.map((date) => (
                <option key={date} value={date}>{date}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="planning-filter-search" className="text-xs">{labels.searchRoleName}</Label>
            <Input
              id="planning-filter-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={labels.searchPlaceholder}
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
                          {filled} {labels.ofPositionsFilled} {dayMembers.length} {labels.positionsFilled} · {catering} {labels.catering} · {hotel} {labels.hotel}
                        </p>
                      )}
                    </div>
                    {dayPositions.map((position) => {
                      const positionMembers = linkedMembers.filter(
                        (m) => m.crew_position_id === position.id
                      );
                      return (
                        <div key={position.id} className="space-y-1.5">
                          <PositionForm
                            projectId={projectId}
                            position={position}
                            suppliers={suppliers}
                            stages={stages}
                            labels={labels}
                          />
                          {positionMembers.length > 0 && (
                            <div className="space-y-1.5 pl-3">
                              <p className="text-xs font-medium text-muted-foreground">{labels.linkedPeople}</p>
                              {positionMembers.map((member) => (
                                <PositionMemberForm
                                  key={member.id}
                                  projectId={projectId}
                                  member={member}
                                  freelancers={freelancers}
                                  labels={labels}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}

        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">{labels.addNewPosition}</p>
          <PositionForm projectId={projectId} suppliers={suppliers} stages={stages} labels={labels} />
        </div>
      </CardContent>
    </Card>
  );
}
