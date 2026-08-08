"use client";

import { calcTimelinePositionPercent, formatDuration, RUNDOWN_COLOR_BG_CLASSES } from "@/lib/rundown-time";
import { cn } from "@/lib/utils";

export interface RundownTimelineLabels {
  legend: string;
}

// Horizontale, proportioneel geschaalde balk van de hele show: elke cue als
// gekleurd blok ter grootte van zijn duur, met een bewegende "nu"-marker
// tijdens een live show. Geeft in één oogopslag de "vorm" van de show weer —
// een aanvulling op de lijst hieronder, niet een vervanging.
export function RundownTimeline({
  items,
  currentItemId,
  currentItemStartedAt,
  isLive,
  now,
  labels,
}: {
  items: { id: string; name: string; color: string; duration_seconds: number }[];
  currentItemId: string | null;
  currentItemStartedAt: string | null;
  isLive: boolean;
  now: number;
  labels: RundownTimelineLabels;
}) {
  const totalSeconds = items.reduce((sum, i) => sum + i.duration_seconds, 0);
  if (items.length === 0 || totalSeconds <= 0) return null;

  const positionPercent = isLive
    ? calcTimelinePositionPercent({ items, currentItemId, currentItemStartedAt, now })
    : null;

  return (
    <div className="space-y-1 border-b border-white/10 pb-4">
      <div className="relative flex h-6 w-full overflow-hidden rounded-md bg-white/10">
        {items.map((item) => {
          const isCurrent = item.id === currentItemId;
          return (
            <div
              key={item.id}
              title={`${item.name} (${formatDuration(item.duration_seconds)})`}
              style={{ flexBasis: `${(item.duration_seconds / totalSeconds) * 100}%` }}
              className={cn(
                "h-full min-w-[2px] shrink-0 grow-0 border-r border-black/40 last:border-r-0",
                item.color && RUNDOWN_COLOR_BG_CLASSES[item.color] ? RUNDOWN_COLOR_BG_CLASSES[item.color] : "bg-white/25",
                isCurrent && "ring-2 ring-inset ring-white"
              )}
            />
          );
        })}
        {positionPercent !== null && (
          <div
            className="pointer-events-none absolute top-0 h-full w-0.5 bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)]"
            style={{ left: `${positionPercent}%` }}
          />
        )}
      </div>
      <p className="text-[10px] text-white/40">{labels.legend}</p>
    </div>
  );
}
