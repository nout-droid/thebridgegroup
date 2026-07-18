import { cn } from "@/lib/utils";

export function Footer({ variant = "light" }: { variant?: "light" | "dark" }) {
  return (
    <footer
      className={cn(
        "mt-auto py-4 text-center text-xs",
        variant === "dark" ? "text-white/40" : "text-muted-foreground"
      )}
    >
      © 2026 The Bridge Group B.V.
    </footer>
  );
}
