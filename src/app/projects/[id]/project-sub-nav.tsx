import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "overview", label: "Overzicht" },
  { key: "budget", label: "Begroting" },
  { key: "media", label: "Media" },
  { key: "guests", label: "Gastenportaal" },
  { key: "rider", label: "Rider" },
  { key: "schedule", label: "Draaiboek" },
  { key: "rundown", label: "Rundown" },
  { key: "production", label: "Productie" },
] as const;

export type ProjectTabKey = (typeof TABS)[number]["key"];

function tabHref(projectId: string, key: ProjectTabKey) {
  if (key === "overview") return `/projects/${projectId}`;
  return `/projects/${projectId}/${key}`;
}

export function ProjectSubNav({
  projectId,
  projectName,
  active,
}: {
  projectId: string;
  projectName: string;
  active: ProjectTabKey;
}) {
  return (
    <div className="border-b bg-muted/30">
      <div className="mx-auto max-w-5xl px-6 pt-4">
        <h1 className="text-lg font-semibold">{projectName}</h1>
        <nav className="mt-3 flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
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
