"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { LanguageToggle } from "@/components/language-toggle";
import { useSupplierTranslator } from "../translator-context";

const TABS = [
  { key: "crew", label: "Crew & Accreditatie" },
  { key: "equipment", label: "Materieel" },
  { key: "comms", label: "Comms & Portofoons" },
  { key: "power", label: "Stroom" },
  { key: "catering", label: "Catering" },
  { key: "hotel", label: "Hotel" },
  { key: "flight", label: "Vluchten" },
] as const;

export type AanvragenTabKey = (typeof TABS)[number]["key"];

function tabHref(supplierId: string, key: AanvragenTabKey) {
  const base = `/supplier-portal/${supplierId}/aanvragen`;
  return key === "crew" ? base : `${base}/${key}`;
}

export function AanvragenSubNav({
  supplierId,
  projects,
  selectedProjectId,
  active,
  showTravel,
}: {
  supplierId: string;
  projects: { id: string; name: string }[];
  selectedProjectId: string | null;
  active: AanvragenTabKey;
  showTravel: boolean;
}) {
  const { lang, setLang, t } = useSupplierTranslator();
  const tabs = showTravel ? TABS : TABS.filter((tab) => tab.key !== "hotel" && tab.key !== "flight");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl font-extrabold uppercase tracking-tight">{t("Aanvragen")}</h1>
        <LanguageToggle lang={lang} onChange={setLang} />
      </div>

      {!projects.length ? (
        <p className="text-sm text-muted-foreground">
          {t(
            "Er staat nog geen project voor je klaar. Zodra er een offerteverzoek voor je is aangemaakt verschijnt het project hier."
          )}
        </p>
      ) : (
        <>
          {projects.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`${tabHref(supplierId, active)}?project=${project.id}`}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    selectedProjectId === project.id
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  )}
                >
                  {t(project.name)}
                </Link>
              ))}
            </div>
          )}

          <nav className="flex flex-wrap gap-1 border-b pb-2">
            {tabs.map((tab) => (
              <Link
                key={tab.key}
                href={`${tabHref(supplierId, tab.key)}${selectedProjectId ? `?project=${selectedProjectId}` : ""}`}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active === tab.key
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {t(tab.label)}
              </Link>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}
