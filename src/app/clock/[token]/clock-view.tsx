"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { SharedRundowns } from "@/lib/types";
import { calcTotalOvertimeSeconds, formatDuration } from "@/lib/rundown-time";

const POLL_INTERVAL_MS = 2000;

function scopeKey(stageId: string | null) {
  return stageId ?? "project";
}

export function ClockView({ token, stageId }: { token: string; stageId: string | null }) {
  const [data, setData] = useState<SharedRundowns | null>(null);
  const [now, setNow] = useState<number | null>(null);

  const refetch = useCallback(async () => {
    const supabase = createClient();
    const { data: result } = await supabase.rpc("get_shared_rundowns", { p_token: token });
    if (result) setData(result as SharedRundowns);
  }, [token]);

  useEffect(() => {
    refetch();
    const interval = setInterval(refetch, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refetch]);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, []);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white/60">
        Laden&hellip;
      </div>
    );
  }

  const scope = data.scopes.find((s) => scopeKey(s.stage_id) === scopeKey(stageId)) ?? null;
  const rundown = scope?.rundown ?? null;
  const currentItem = scope?.items.find((i) => i.id === rundown?.current_item_id) ?? null;

  if (!rundown?.is_live || !currentItem || now === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black text-white/60">
        <p className="text-2xl">Wachten op start show&hellip;</p>
        {scope?.stage_name && <p className="text-sm uppercase tracking-widest">{scope.stage_name}</p>}
      </div>
    );
  }

  const elapsedSeconds = rundown.current_item_started_at
    ? Math.floor((now - new Date(rundown.current_item_started_at).getTime()) / 1000)
    : 0;
  const remainingSeconds = currentItem.duration_seconds - elapsedSeconds;
  const overtime = remainingSeconds < 0;
  const totalOvertimeSeconds = calcTotalOvertimeSeconds({
    items: scope?.items ?? [],
    currentItemId: rundown.current_item_id,
    currentItemStartedAt: rundown.current_item_started_at,
    actualStartAt: rundown.actual_start_at,
    now,
  });

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col items-center justify-center gap-4 overflow-hidden bg-black p-4 transition-colors",
        overtime && "bg-red-700 animate-clock-blink"
      )}
    >
      <p className="text-[min(4vw,4vh,1.5rem)] font-medium uppercase tracking-widest text-white/70">
        {currentItem.cue_number && `#${currentItem.cue_number} — `}
        {currentItem.name}
      </p>
      <p
        className={cn(
          "font-mono text-[min(22vw,42vh)] leading-none font-bold tabular-nums",
          overtime ? "text-white" : "text-primary"
        )}
      >
        {formatDuration(remainingSeconds)}
      </p>
      {overtime && (
        <p className="text-[min(5vw,5vh,1.5rem)] font-semibold uppercase tracking-widest text-white">
          Over tijd
        </p>
      )}
      {totalOvertimeSeconds > 0 && (
        <p
          className={cn(
            "text-[min(4vw,4vh,1.125rem)] font-medium uppercase tracking-widest",
            overtime ? "text-white/80" : "text-white/50"
          )}
        >
          Totaal opgelopen: +{formatDuration(totalOvertimeSeconds)}
        </p>
      )}
    </div>
  );
}
