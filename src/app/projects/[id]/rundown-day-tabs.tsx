import Link from "next/link";
import { cn } from "@/lib/utils";

export function RundownDayTabs({
  basePath,
  dates,
  selected,
}: {
  basePath: string;
  dates: string[];
  selected: string;
}) {
  if (dates.length <= 1) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {dates.map((date) => (
        <Link
          key={date}
          href={`${basePath}?date=${date}`}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
            date === selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input text-muted-foreground hover:bg-muted"
          )}
        >
          {new Date(`${date}T00:00:00`).toLocaleDateString("nl-NL", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}
        </Link>
      ))}
    </div>
  );
}
