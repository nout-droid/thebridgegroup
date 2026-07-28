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
import { createProject } from "./actions";

export interface NewProjectDialogLabels {
  newProject: string;
  projectName: string;
  client: string;
  eventDate: string;
  create: string;
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
          <Button type="submit" className="w-full">
            {labels.create}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
