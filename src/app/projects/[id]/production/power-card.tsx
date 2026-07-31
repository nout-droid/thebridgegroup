"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { computePowerLoadKw, type PowerRequest, type Stage, type Supplier } from "@/lib/types";
import { SupplierSelect } from "../supplier-select";
import { StageSelect } from "../stage-select";
import { addPowerRequest, deletePowerRequest, updatePowerRequest } from "./power-actions";

export interface PowerCardLabels {
  title: string;
  description: string;
  area: string;
  allStages: string;
  projectWide: string;
  downloadPdf: string;
  stage: string;
  what: string;
  whatPlaceholder: string;
  quantity: string;
  position: string;
  positionPlaceholder: string;
  supplier: string;
  save: string;
  remove: string;
  notes: string;
  addRequest: string;
  chooseStage: string;
  chooseSupplier: string;
  amps: string;
  ampsPlaceholder: string;
  phase: string;
  singlePhase: string;
  threePhase: string;
  loadPerArea: string;
  totalLoad: string;
}

interface AreaLoad {
  areaId: string;
  areaName: string;
  kw: number;
}

function loadPerArea(requests: PowerRequest[], stages: Stage[], labels: PowerCardLabels): AreaLoad[] {
  const byArea = new Map<string, AreaLoad>();
  for (const request of requests) {
    const areaId = request.stage_id ?? "algemeen";
    const areaName = request.stage_id
      ? stages.find((s) => s.id === request.stage_id)?.name ?? labels.allStages
      : labels.projectWide;
    const entry = byArea.get(areaId) ?? { areaId, areaName, kw: 0 };
    entry.kw += computePowerLoadKw(request.amps, request.phase, request.quantity);
    byArea.set(areaId, entry);
  }
  return [...byArea.values()].filter((entry) => entry.kw > 0).sort((a, b) => a.areaName.localeCompare(b.areaName));
}

export function PowerCard({
  projectId,
  requests,
  stages,
  suppliers,
  labels,
}: {
  projectId: string;
  requests: PowerRequest[];
  stages: Stage[];
  suppliers: Supplier[];
  labels: PowerCardLabels;
}) {
  const [areaFilter, setAreaFilter] = useState("alle");
  const filteredRequests =
    areaFilter === "alle"
      ? requests
      : requests.filter((r) => (r.stage_id ?? "algemeen") === areaFilter);
  const areaLoads = loadPerArea(requests, stages, labels);
  const totalKw = areaLoads.reduce((sum, entry) => sum + entry.kw, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{labels.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{labels.description}</p>
        <div className="space-y-1 pt-2">
          <Label htmlFor="power-filter-area" className="text-xs">{labels.area}</Label>
          <select
            id="power-filter-area"
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
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.length > 0 && (
          <a
            href={`/projects/${projectId}/production/power/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary underline"
          >
            {labels.downloadPdf}
          </a>
        )}
        {areaLoads.length > 0 && (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-2 text-left font-medium">{labels.loadPerArea}</th>
                  <th className="p-2 text-left font-medium">kW</th>
                </tr>
              </thead>
              <tbody>
                {areaLoads.map((entry) => (
                  <tr key={entry.areaId} className="border-b last:border-0">
                    <td className="p-2">{entry.areaName}</td>
                    <td className="p-2">{entry.kw.toFixed(1)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="p-2">{labels.totalLoad}</td>
                  <td className="p-2">{totalKw.toFixed(1)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {filteredRequests.map((request) => (
          <form
            key={request.id}
            action={updatePowerRequest.bind(null, projectId, request.id)}
            className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-6"
          >
            <div className="space-y-1">
              <Label htmlFor={`stage-${request.id}`} className="text-xs">{labels.stage}</Label>
              <StageSelect
                id={`stage-${request.id}`}
                defaultValue={request.stage_id ?? undefined}
                stages={stages}
                placeholder={labels.chooseStage}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`desc-${request.id}`} className="text-xs">{labels.what}</Label>
              <Input
                id={`desc-${request.id}`}
                name="description"
                defaultValue={request.description}
                placeholder={labels.whatPlaceholder}
                className="h-8 text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`qty-${request.id}`} className="text-xs">{labels.quantity}</Label>
              <Input
                id={`qty-${request.id}`}
                name="quantity"
                type="number"
                min={1}
                defaultValue={request.quantity}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`pos-${request.id}`} className="text-xs">{labels.position}</Label>
              <Input
                id={`pos-${request.id}`}
                name="position"
                defaultValue={request.position}
                placeholder={labels.positionPlaceholder}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`supplier-${request.id}`} className="text-xs">{labels.supplier}</Label>
              <SupplierSelect
                id={`supplier-${request.id}`}
                defaultValue={request.supplier_id ?? undefined}
                suppliers={suppliers}
                placeholder={labels.chooseSupplier}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`amps-${request.id}`} className="text-xs">{labels.amps}</Label>
              <Input
                id={`amps-${request.id}`}
                name="amps"
                type="number"
                step="0.1"
                min={0}
                defaultValue={request.amps ?? undefined}
                placeholder={labels.ampsPlaceholder}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`phase-${request.id}`} className="text-xs">{labels.phase}</Label>
              <select
                id={`phase-${request.id}`}
                name="phase"
                defaultValue={request.phase}
                className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs"
              >
                <option value={1}>{labels.singlePhase}</option>
                <option value={3}>{labels.threePhase}</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" size="sm" className="h-8 text-xs">
                {labels.save}
              </Button>
              <Button
                type="submit"
                formAction={deletePowerRequest.bind(null, projectId, request.id)}
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
              >
                {labels.remove}
              </Button>
            </div>
            <div className="space-y-1 sm:col-span-6">
              <Label htmlFor={`notes-${request.id}`} className="text-xs">{labels.notes}</Label>
              <Input
                id={`notes-${request.id}`}
                name="notes"
                defaultValue={request.notes}
                className="h-8 text-xs"
              />
            </div>
          </form>
        ))}

        <form
          action={addPowerRequest.bind(null, projectId)}
          className="grid grid-cols-2 gap-2 border-t pt-4 sm:grid-cols-6"
        >
          <div className="space-y-1">
            <Label htmlFor="new-stage" className="text-xs">{labels.stage}</Label>
            <StageSelect id="new-stage" stages={stages} placeholder={labels.chooseStage} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-desc" className="text-xs">{labels.what}</Label>
            <Input id="new-desc" name="description" placeholder={labels.whatPlaceholder} className="h-8 text-xs" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-qty" className="text-xs">{labels.quantity}</Label>
            <Input id="new-qty" name="quantity" type="number" min={1} defaultValue={1} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-pos" className="text-xs">{labels.position}</Label>
            <Input id="new-pos" name="position" placeholder={labels.positionPlaceholder} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-supplier" className="text-xs">{labels.supplier}</Label>
            <SupplierSelect id="new-supplier" suppliers={suppliers} placeholder={labels.chooseSupplier} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-amps" className="text-xs">{labels.amps}</Label>
            <Input
              id="new-amps"
              name="amps"
              type="number"
              step="0.1"
              min={0}
              placeholder={labels.ampsPlaceholder}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-phase" className="text-xs">{labels.phase}</Label>
            <select
              id="new-phase"
              name="phase"
              defaultValue={1}
              className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs"
            >
              <option value={1}>{labels.singlePhase}</option>
              <option value={3}>{labels.threePhase}</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" size="sm" className="h-8 text-xs">
              {labels.addRequest}
            </Button>
          </div>
          <div className="space-y-1 sm:col-span-6">
            <Label htmlFor="new-notes" className="text-xs">{labels.notes}</Label>
            <Input id="new-notes" name="notes" className="h-8 text-xs" />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
