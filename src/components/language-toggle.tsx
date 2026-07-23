"use client";

import { Button } from "@/components/ui/button";
import type { Lang } from "@/hooks/use-translator";

export function LanguageToggle({
  lang,
  onChange,
  variant = "light",
}: {
  lang: Lang;
  onChange: (lang: Lang) => void;
  variant?: "light" | "dark";
}) {
  const inactiveClass =
    variant === "dark" ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-muted-foreground";

  return (
    <div className="flex gap-1">
      <Button
        type="button"
        size="sm"
        variant={lang === "nl" ? "secondary" : "ghost"}
        className={lang === "nl" ? "" : inactiveClass}
        onClick={() => onChange("nl")}
      >
        NL
      </Button>
      <Button
        type="button"
        size="sm"
        variant={lang === "en" ? "secondary" : "ghost"}
        className={lang === "en" ? "" : inactiveClass}
        onClick={() => onChange("en")}
      >
        EN
      </Button>
    </div>
  );
}
