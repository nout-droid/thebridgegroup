"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTranslator } from "@/hooks/use-translator";
import { LanguageToggle } from "@/components/language-toggle";

const STATIC_LABELS = [
  "Aanvragen",
  "Er staat nog geen project voor je klaar. Zodra er een offerteverzoek voor je is aangemaakt verschijnt het project hier.",
];

export function AanvragenHeader({
  supplierId,
  projects,
  selectedProjectId,
}: {
  supplierId: string;
  projects: { id: string; name: string }[];
  selectedProjectId: string | null;
}) {
  const dynamicTexts = projects.map((p) => p.name);
  const { lang, setLang, t } = useTranslator(STATIC_LABELS, dynamicTexts);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl font-extrabold uppercase tracking-tight">
          {t("Aanvragen")}
        </h1>
        <LanguageToggle lang={lang} onChange={setLang} />
      </div>

      {!projects.length ? (
        <p className="text-sm text-muted-foreground">
          {t(
            "Er staat nog geen project voor je klaar. Zodra er een offerteverzoek voor je is aangemaakt verschijnt het project hier."
          )}
        </p>
      ) : (
        projects.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/supplier-portal/${supplierId}/aanvragen?project=${project.id}`}
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
        )
      )}
    </>
  );
}
