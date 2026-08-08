// Kleine, dependency-vrije tijdshelpers voor de show rundown: cue-duur
// parsen/formatteren ("mm:ss") en cue-starttijden doorrekenen vanaf de
// show-starttijd, puur functioneel zodat zowel de server actions (parsen)
// als de client component (weergave) dezelfde logica gebruiken.

export function parseDuration(input: string): number {
  const trimmed = input.trim();
  if (!trimmed) return 0;

  const parts = trimmed.split(":").map((p) => Number(p));
  if (parts.some((p) => Number.isNaN(p))) return 0;

  if (parts.length === 1) return Math.max(0, Math.round(parts[0]));
  if (parts.length === 2) return Math.max(0, parts[0] * 60 + parts[1]);
  return Math.max(0, parts[0] * 3600 + parts[1] * 60 + parts[2]);
}

export function formatDuration(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? "-" : "";
  const seconds = Math.abs(Math.round(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${sign}${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${sign}${m}:${String(s).padStart(2, "0")}`;
}

// start_time uit Postgres komt als "HH:MM:SS" (of "HH:MM"). Telt secondsToAdd
// op en geeft weer een "HH:MM:SS" string terug, binnen dezelfde dag (wrapt om
// middernacht heen — praktisch voor shows die na 00:00 doorlopen).
export function addSecondsToTime(time: string, secondsToAdd: number): string {
  const [h = 0, m = 0, s = 0] = time.split(":").map((p) => Number(p) || 0);
  const totalSeconds = ((h * 3600 + m * 60 + s + secondsToAdd) % 86400 + 86400) % 86400;

  const hh = Math.floor(totalSeconds / 3600);
  const mm = Math.floor((totalSeconds % 3600) / 60);
  const ss = totalSeconds % 60;

  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export function formatClock(time: string): string {
  const [h = "00", m = "00"] = time.split(":");
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

// Totale opgelopen overtijd over de hele show: de vertraging waarmee de
// huidige cue daadwerkelijk gestart is t.o.v. het geplande moment (som van
// de overtijd van alle voorgaande cues) plus de overtijd van de huidige cue
// zelf. Vereist actual_start_at (vastgelegd bij "Start show") als anker —
// zonder dat anker (oudere/nooit gestarte shows) is het resultaat 0.
export function calcTotalOvertimeSeconds({
  items,
  currentItemId,
  currentItemStartedAt,
  actualStartAt,
  now,
}: {
  items: { id: string; duration_seconds: number }[];
  currentItemId: string | null;
  currentItemStartedAt: string | null;
  actualStartAt: string | null;
  now: number;
}): number {
  if (!actualStartAt || !currentItemStartedAt || !currentItemId) return 0;

  const idx = items.findIndex((i) => i.id === currentItemId);
  if (idx === -1) return 0;

  const cumBeforeSeconds = items.slice(0, idx).reduce((sum, i) => sum + i.duration_seconds, 0);
  const currentDuration = items[idx].duration_seconds;

  const startedAtMs = new Date(currentItemStartedAt).getTime();
  const actualStartMs = new Date(actualStartAt).getTime();

  const priorDelaySeconds = (startedAtMs - actualStartMs) / 1000 - cumBeforeSeconds;
  const elapsedInCurrentSeconds = (now - startedAtMs) / 1000;
  const currentOverrunSeconds = Math.max(0, elapsedInCurrentSeconds - currentDuration);

  return priorDelaySeconds + currentOverrunSeconds;
}

// Kleurnamen (zelfde set als de cue-kleur-select) naar een achtergrondklasse
// voor de tijdlijnbalk — los van COLOR_BORDER_CLASSES in rundown-live.tsx/
// showcaller-view.tsx, die is voor de linkerrand van een cue-rij.
export const RUNDOWN_COLOR_BG_CLASSES: Record<string, string> = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
};

// Positie van de "nu"-marker op de tijdlijnbalk, als percentage (0-100) van de
// totale geplande showduur: cumulatieve duur van alle cues vóór de huidige,
// plus verstreken tijd in de huidige cue. Bewust los van calcTotalOvertimeSeconds
// (die telt vertraging t.o.v. het schema) — dit is puur "waar sta ik in de lijst".
export function calcTimelinePositionPercent({
  items,
  currentItemId,
  currentItemStartedAt,
  now,
}: {
  items: { id: string; duration_seconds: number }[];
  currentItemId: string | null;
  currentItemStartedAt: string | null;
  now: number;
}): number | null {
  if (!currentItemId || !currentItemStartedAt) return null;

  const idx = items.findIndex((i) => i.id === currentItemId);
  if (idx === -1) return null;

  const totalSeconds = items.reduce((sum, i) => sum + i.duration_seconds, 0);
  if (totalSeconds <= 0) return null;

  const cumBeforeSeconds = items.slice(0, idx).reduce((sum, i) => sum + i.duration_seconds, 0);
  const elapsedInCurrentSeconds = (now - new Date(currentItemStartedAt).getTime()) / 1000;

  const positionSeconds = cumBeforeSeconds + Math.max(0, elapsedInCurrentSeconds);
  return Math.min(100, Math.max(0, (positionSeconds / totalSeconds) * 100));
}
