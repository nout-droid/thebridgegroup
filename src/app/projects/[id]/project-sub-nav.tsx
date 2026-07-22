import Link from "next/link";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { checkCanViewBudget } from "@/lib/server/team";

const TABS = [
  { key: "overview", label: "Overzicht" },
  { key: "intake", label: "Aanvraag checklist" },
  { key: "budget", label: "Begroting" },
  { key: "rider", label: "Event rider" },
  { key: "schedule", label: "Draaiboek" },
  { key: "rundown", label: "Rundown" },
  { key: "production", label: "Productie" },
  { key: "media", label: "Media" },
  { key: "documents", label: "Documenten" },
  { key: "evaluation", label: "Evaluatie" },
  { key: "guests", label: "Gastenportaal" },
] as const;

export type ProjectTabKey = (typeof TABS)[number]["key"];

function tabHref(projectId: string, key: ProjectTabKey) {
  if (key === "overview") return `/projects/${projectId}`;
  return `/projects/${projectId}/${key}`;
}

export async function ProjectSubNav({
  projectId,
  projectName,
  active,
}: {
  projectId: string;
  projectName: string;
  active: ProjectTabKey;
}) {
  const supabase = await createClient();
  const canViewBudget = await checkCanViewBudget(supabase, projectId);
  const tabs = TABS.filter((tab) => tab.key !== "budget" || canViewBudget);

  return (
    <div className="border-b bg-muted/30">
      <div className="mx-auto max-w-5xl px-6 pt-4">
        <h1 className="text-lg font-semibold">{projectName}</h1>
        <nav className="mt-3 flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={tabHref(projectId, tab.key)}
              className={cn(
                "whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                active === tab.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
