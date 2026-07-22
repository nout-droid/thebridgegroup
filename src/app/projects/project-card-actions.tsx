"use client";

import { Button } from "@/components/ui/button";
import { deleteProject, duplicateProject } from "./actions";

export function ProjectCardActions({ projectId }: { projectId: string }) {
  return (
    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
      <form action={duplicateProject.bind(null, projectId)}>
        <Button type="submit" size="sm" variant="ghost" className="h-7 text-xs">
          Dupliceren
        </Button>
      </form>
      <form
        action={deleteProject.bind(null, projectId)}
        onSubmit={(e) => {
          if (!confirm("Dit project en alles daarin (offertes, draaiboek, crew, rider, ...) definitief verwijderen? Dit kan niet ongedaan worden gemaakt.")) {
            e.preventDefault();
          }
        }}
      >
        <Button type="submit" size="sm" variant="ghost" className="h-7 text-xs text-destructive">
          Verwijderen
        </Button>
      </form>
    </div>
  );
}
