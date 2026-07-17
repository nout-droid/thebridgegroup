import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "overview", label: "Overzicht" },
  { key: "rider", label: "Rider" },
  { key: "schedule", label: "Draaiboek" },
  { key: "rundown", label: "Rundown" },
] as const;

export type StageTabKey = (typeof TABS)[number]["key"];

function tabHref(projectId: string, stageId: string, key: StageTabKey) {
  const base = `/projects/${projectId}/stages/${stageId}`;
  return key === "overview" ? base : `${base}/${key}`;
}

export function StageSubNav({
  projectId,
  stageId,
  stageName,
  active,
}: {
  projectId: string;
  stageId: string;
  stageName: string;
  active: StageTabKey;
}) {
  return (
    <div className="border-b bg-muted/30">
      <div className="mx-auto max-w-5xl px-6 pt-4">
        <Link
          href={`/projects/${projectId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          &larr; Terug naar project
        </Link>
        <h1 className="mt-1 text-lg font-semibold">{stageName}</h1>
        <nav className="mt-3 flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <Link
              key={tab.key}
              href={tabHref(projectId, stageId, tab.key)}
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
