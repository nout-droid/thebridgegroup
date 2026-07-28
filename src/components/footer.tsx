import Link from "next/link";
import { cn } from "@/lib/utils";

export function Footer({ variant = "light" }: { variant?: "light" | "dark" }) {
  return (
    <footer
      className={cn(
        "mt-auto space-y-1 py-4 text-center text-xs",
        variant === "dark" ? "text-white/40" : "text-muted-foreground"
      )}
    >
      <p>© 2026 The Bridge Group B.V.</p>
      <p className="space-x-3">
        <Link href="/terms" className="underline-offset-4 hover:underline">
          Algemene voorwaarden
        </Link>
        <Link href="/privacy" className="underline-offset-4 hover:underline">
          Privacyverklaring
        </Link>
      </p>
    </footer>
  );
}
