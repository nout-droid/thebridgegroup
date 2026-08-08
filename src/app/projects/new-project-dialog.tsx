"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EVENT_TYPES, EVENT_TYPE_LABELS } from "@/lib/types";
import { createProject } from "./actions";

export interface NewProjectDialogLabels {
  newProject: string;
  projectName: string;
  client: string;
  eventDate: string;
  eventType: string;
  preProductionWeeks: string;
  venue: string;
  venuePlaceholder: string;
  create: string;
  eventTypeLabels: Record<string, string>;
}

export function NewProjectDialog({ labels }: { labels: NewProjectDialogLabels }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>{labels.newProject}</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{labels.newProject}</DialogTitle>
        </DialogHeader>
        <form action={createProject} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{labels.projectName}</Label>
            <Input id="name" name="name" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client_name">{labels.client}</Label>
            <Input id="client_name" name="client_name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event_date">{labels.eventDate}</Label>
            <Input id="event_date" name="event_date" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event_type">{labels.eventType}</Label>
            <select
              id="event_type"
              name="event_type"
              defaultValue="festival"
              className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
            >
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {labels.eventTypeLabels[type] ?? EVENT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pre_production_weeks">{labels.preProductionWeeks}</Label>
            <Input id="pre_production_weeks" name="pre_production_weeks" type="number" min={0} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="venue_name">{labels.venue}</Label>
            <Input id="venue_name" name="venue_name" placeholder={labels.venuePlaceholder} />
          </div>
          <Button type="submit" className="w-full">
            {labels.create}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
