import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "planning", label: "Planning" },
  { key: "crew", label: "Crew & Accreditatie" },
  { key: "hotel", label: "Hotel & Vluchten" },
  { key: "materieel", label: "Materieel" },
  { key: "comms", label: "Comms & Portofoons" },
  { key: "power", label: "Stroom" },
  { key: "catering", label: "Catering" },
  { key: "artiesten", label: "Artiestenriders" },
  { key: "vragen", label: "Open vragen" },
] as const;

export type ProductionTabKey = (typeof TABS)[number]["key"];

function tabHref(projectId: string, key: ProductionTabKey) {
  const base = `/projects/${projectId}/production`;
  return key === "crew" ? base : `${base}/${key}`;
}

export function ProductionSubNav({
  projectId,
  active,
}: {
  projectId: string;
  active: ProductionTabKey;
}) {
  return (
    <div className="border-b">
      <div className="mx-auto max-w-5xl px-6 py-2">
        <nav className="flex flex-wrap gap-1">
          {TABS.map((tab) => (
            <Link
              key={tab.key}
              href={tabHref(projectId, tab.key)}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active === tab.key
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted"
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
