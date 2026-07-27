import { cn } from "@/lib/utils";
import type { AppLang } from "@/lib/server/lang";
import { setAppLang } from "@/lib/server/lang-actions";

// Server-component variant van LanguageToggle, voor het interne (Server Component-based)
// deel van de app: wisselt van taal via een cookie + server action i.p.v. client-side state.
export function AppLangToggle({ lang, dark = false }: { lang: AppLang; dark?: boolean }) {
  const base = "rounded-md px-2 py-1 text-xs font-semibold transition-colors";
  const inactive = dark ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-muted-foreground hover:bg-muted";
  const active = dark ? "bg-white/15 text-white" : "bg-foreground text-background";

  return (
    <div className="flex gap-1">
      <form action={setAppLang.bind(null, "nl")}>
        <button type="submit" className={cn(base, lang === "nl" ? active : inactive)}>
          NL
        </button>
      </form>
      <form action={setAppLang.bind(null, "en")}>
        <button type="submit" className={cn(base, lang === "en" ? active : inactive)}>
          EN
        </button>
      </form>
    </div>
  );
}
