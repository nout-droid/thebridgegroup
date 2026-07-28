"use client";

import { Button } from "@/components/ui/button";
import { deleteProject, duplicateProject } from "./actions";

export interface ProjectCardActionsLabels {
  duplicate: string;
  remove: string;
  confirmDelete: string;
}

export function ProjectCardActions({
  projectId,
  labels,
}: {
  projectId: string;
  labels: ProjectCardActionsLabels;
}) {
  return (
    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
      <form action={duplicateProject.bind(null, projectId)}>
        <Button type="submit" size="sm" variant="ghost" className="h-7 text-xs">
          {labels.duplicate}
        </Button>
      </form>
      <form
        action={deleteProject.bind(null, projectId)}
        onSubmit={(e) => {
          if (!confirm(labels.confirmDelete)) {
            e.preventDefault();
          }
        }}
      >
        <Button type="submit" size="sm" variant="ghost" className="h-7 text-xs text-destructive">
          {labels.remove}
        </Button>
      </form>
    </div>
  );
}
