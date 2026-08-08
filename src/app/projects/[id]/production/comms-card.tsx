"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { CommsAssignment, CommsKind, CrewMember, Stage, Supplier } from "@/lib/types";
import { SupplierSelect } from "../supplier-select";
import { StageSelect } from "../stage-select";
import { CrewMemberSelect } from "../crew-member-select";
import { addCommsAssignment, deleteCommsAssignment, updateCommsAssignment } from "./comms-actions";

export interface CommsCardLabels {
  title: string;
  description: string;
  area: string;
  allStages: string;
  projectWide: string;
  supplier: string;
  allSuppliers: string;
  searchUser: string;
  searchUserPlaceholder: string;
  downloadPdf: string;
  user: string;
  save: string;
  remove: string;
  crewMember: string;
  add: string;
  intercomTitle: string;
  intercomDescription: string;
  intercomDeviceLabel: string;
  intercomDevicePlaceholder: string;
  intercomChannelsLabel: string;
  intercomChannelsPlaceholder: string;
  portofoonTitle: string;
  portofoonDescription: string;
  portofoonDeviceLabel: string;
  portofoonDevicePlaceholder: string;
  portofoonChannelsLabel: string;
  portofoonChannelsPlaceholder: string;
  chooseStage: string;
  chooseSupplier: string;
  chooseCrewMember: string;
}

function CommsList({
  projectId,
  kind,
  title,
  description,
  deviceLabel,
  devicePlaceholder,
  channelsLabel,
  channelsPlaceholder,
  items,
  suppliers,
  crewMembers,
  stages,
  labels,
}: {
  projectId: string;
  kind: CommsKind;
  title: string;
  description: string;
  deviceLabel: string;
  devicePlaceholder: string;
  channelsLabel: string;
  channelsPlaceholder: string;
  items: CommsAssignment[];
  suppliers: Supplier[];
  crewMembers: CrewMember[];
  stages: Stage[];
  labels: CommsCardLabels;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {items.map((item) => (
        <form
          key={item.id}
          action={updateCommsAssignment.bind(null, projectId, item.id)}
          className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-4"
        >
          <div className="space-y-1">
            <Label htmlFor={`user-${item.id}`} className="text-xs">{labels.user}</Label>
            <Input
              id={`user-${item.id}`}
              name="user_name"
              defaultValue={item.user_name}
              className="h-8 text-xs"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`stage-${item.id}`} className="text-xs">{labels.area}</Label>
            <StageSelect
              id={`stage-${item.id}`}
              defaultValue={item.stage_id ?? undefined}
              stages={stages}
              placeholder={labels.chooseStage}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`device-${item.id}`} className="text-xs">{deviceLabel}</Label>
            <Input
              id={`device-${item.id}`}
              name="device_type"
              defaultValue={item.device_type}
              placeholder={devicePlaceholder}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`channels-${item.id}`} className="text-xs">{channelsLabel}</Label>
            <Input
              id={`channels-${item.id}`}
              name="channels"
              defaultValue={item.channels}
              placeholder={channelsPlaceholder}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`supplier-${item.id}`} className="text-xs">{labels.supplier}</Label>
            <SupplierSelect
              id={`supplier-${item.id}`}
              defaultValue={item.supplier_id ?? undefined}
              suppliers={suppliers}
              placeholder={labels.chooseSupplier}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`crew-${item.id}`} className="text-xs">{labels.crewMember}</Label>
            <CrewMemberSelect
              id={`crew-${item.id}`}
              defaultValue={item.crew_member_id ?? undefined}
              members={crewMembers}
              placeholder={labels.chooseCrewMember}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" size="sm" className="h-8 text-xs">
              {labels.save}
            </Button>
            <Button
              type="submit"
              formAction={deleteCommsAssignment.bind(null, projectId, item.id)}
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
            >
              {labels.remove}
            </Button>
          </div>
        </form>
      ))}

      <form
        action={addCommsAssignment.bind(null, projectId, kind)}
        className="grid grid-cols-2 gap-2 border-t pt-3 sm:grid-cols-4"
      >
        <div className="space-y-1">
          <Label htmlFor={`new-user-${kind}`} className="text-xs">{labels.user}</Label>
          <Input id={`new-user-${kind}`} name="user_name" className="h-8 text-xs" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`new-stage-${kind}`} className="text-xs">{labels.area}</Label>
          <StageSelect id={`new-stage-${kind}`} stages={stages} placeholder={labels.chooseStage} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`new-device-${kind}`} className="text-xs">{deviceLabel}</Label>
          <Input
            id={`new-device-${kind}`}
            name="device_type"
            placeholder={devicePlaceholder}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`new-channels-${kind}`} className="text-xs">{channelsLabel}</Label>
          <Input
            id={`new-channels-${kind}`}
            name="channels"
            placeholder={channelsPlaceholder}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`new-supplier-${kind}`} className="text-xs">{labels.supplier}</Label>
          <SupplierSelect id={`new-supplier-${kind}`} suppliers={suppliers} placeholder={labels.chooseSupplier} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`new-crew-${kind}`} className="text-xs">{labels.crewMember}</Label>
          <CrewMemberSelect id={`new-crew-${kind}`} members={crewMembers} placeholder={labels.chooseCrewMember} />
        </div>
        <div className="flex items-end">
          <Button type="submit" size="sm" className="h-8 text-xs">
            {labels.add}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function CommsCard({
  projectId,
  intercomAssignments,
  portofoonAssignments,
  suppliers,
  crewMembers,
  stages,
  labels,
}: {
  projectId: string;
  intercomAssignments: CommsAssignment[];
  portofoonAssignments: CommsAssignment[];
  suppliers: Supplier[];
  crewMembers: CrewMember[];
  stages: Stage[];
  labels: CommsCardLabels;
}) {
  const [areaFilter, setAreaFilter] = useState("alle");
  const [supplierFilter, setSupplierFilter] = useState("alle");
  const [search, setSearch] = useState("");

  function applyFilters(items: CommsAssignment[]) {
    return items.filter((item) => {
      if (areaFilter !== "alle" && (item.stage_id ?? "algemeen") !== areaFilter) return false;
      if (supplierFilter !== "alle" && (item.supplier_id ?? "") !== supplierFilter) return false;
      if (search.trim() && !item.user_name.toLowerCase().includes(search.trim().toLowerCase())) {
        return false;
      }
      return true;
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{labels.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{labels.description}</p>
        <div className="flex flex-wrap items-end gap-2 pt-2">
          <div className="space-y-1">
            <Label htmlFor="comms-filter-area" className="text-xs">{labels.area}</Label>
            <select
              id="comms-filter-area"
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
            <Label htmlFor="comms-filter-supplier" className="text-xs">{labels.supplier}</Label>
            <select
              id="comms-filter-supplier"
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
            >
              <option value="alle">{labels.allSuppliers}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="comms-filter-search" className="text-xs">{labels.searchUser}</Label>
            <Input
              id="comms-filter-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={labels.searchUserPlaceholder}
              className="h-8 w-40 text-xs"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {(intercomAssignments.length > 0 || portofoonAssignments.length > 0) && (
          <a
            href={`/projects/${projectId}/production/comms/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary underline"
          >
            {labels.downloadPdf}
          </a>
        )}
        <CommsList
          projectId={projectId}
          kind="intercom"
          title={labels.intercomTitle}
          description={labels.intercomDescription}
          deviceLabel={labels.intercomDeviceLabel}
          devicePlaceholder={labels.intercomDevicePlaceholder}
          channelsLabel={labels.intercomChannelsLabel}
          channelsPlaceholder={labels.intercomChannelsPlaceholder}
          items={applyFilters(intercomAssignments)}
          suppliers={suppliers}
          crewMembers={crewMembers}
          stages={stages}
          labels={labels}
        />
        <CommsList
          projectId={projectId}
          kind="portofoon"
          title={labels.portofoonTitle}
          description={labels.portofoonDescription}
          deviceLabel={labels.portofoonDeviceLabel}
          devicePlaceholder={labels.portofoonDevicePlaceholder}
          channelsLabel={labels.portofoonChannelsLabel}
          channelsPlaceholder={labels.portofoonChannelsPlaceholder}
          items={applyFilters(portofoonAssignments)}
          suppliers={suppliers}
          crewMembers={crewMembers}
          stages={stages}
          labels={labels}
        />
      </CardContent>
    </Card>
  );
}
