"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DivisionSelect } from "@/components/division-select";
import type { Rundown, RundownItem } from "@/lib/types";
import { addSecondsToTime, calcTotalOvertimeSeconds, formatDuration } from "@/lib/rundown-time";
import {
  addRundownInstruction,
  addRundownItem,
  deleteRundownInstruction,
  deleteRundownItem,
  moveRundownItem,
  nextCue,
  previousCue,
  setRundownStartTime,
  startShow,
  stopShow,
  updateRundownItem,
} from "./rundown-actions";

const COLOR_OPTIONS = [
  { value: "none", label: "Geen" },
  { value: "red", label: "Rood" },
  { value: "orange", label: "Oranje" },
  { value: "yellow", label: "Geel" },
  { value: "green", label: "Groen" },
  { value: "blue", label: "Blauw" },
  { value: "purple", label: "Paars" },
] as const;

const COLOR_BORDER_CLASSES: Record<string, string> = {
  red: "border-l-4 border-l-red-500",
  orange: "border-l-4 border-l-orange-500",
  yellow: "border-l-4 border-l-yellow-500",
  green: "border-l-4 border-l-green-500",
  blue: "border-l-4 border-l-blue-500",
  purple: "border-l-4 border-l-purple-500",
};

function ColorSelect({ id, defaultValue }: { id: string; defaultValue?: string }) {
  return (
    <Select name="color" defaultValue={defaultValue || "none"} items={COLOR_OPTIONS}>
      <SelectTrigger id={id} className="h-8 text-xs">
        <SelectValue placeholder="Geen" />
      </SelectTrigger>
      <SelectContent>
        {COLOR_OPTIONS.map((c) => (
          <SelectItem key={c.value} value={c.value}>
            {c.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function RundownLive({
  projectId,
  stageId,
  rundownId,
  shareToken,
  initialRundown,
  initialItems,
}: {
  projectId: string;
  stageId: string | null;
  rundownId: string;
  shareToken: string;
  initialRundown: Rundown;
  initialItems: RundownItem[];
}) {
  const [rundown, setRundown] = useState(initialRundown);
  const [items, setItems] = useState(initialItems);
  // null tijdens SSR/eerste render, zodat server en client identiek renderen;
  // pas ná mount vullen we 'm zodat Date.now() nooit in de SSR-output belandt.
  const [now, setNow] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const currentRowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function refetchItems() {
      const { data } = await supabase
        .from("rundown_items")
        .select("*, instructions:rundown_item_instructions(*)")
        .eq("rundown_id", rundownId)
        .order("sort_order", { ascending: true })
        .order("sort_order", { foreignTable: "rundown_item_instructions", ascending: true });
      if (data) setItems(data as RundownItem[]);
    }

    const channel = supabase
      .channel(`rundown-${rundownId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rundowns", filter: `id=eq.${rundownId}` },
        (payload) => {
          if (payload.eventType === "DELETE") return;
          setRundown(payload.new as Rundown);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rundown_items", filter: `rundown_id=eq.${rundownId}` },
        refetchItems
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rundown_item_instructions" },
        refetchItems
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rundownId]);

  useEffect(() => {
    setNow(Date.now());
    if (!rundown.is_live) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [rundown.is_live]);

  useEffect(() => {
    currentRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [rundown.current_item_id]);

  let cursor = rundown.start_time;
  const rows = items.map((item) => {
    const start = cursor;
    const end = addSecondsToTime(cursor, item.duration_seconds);
    cursor = end;
    return { item, start, end };
  });

  const currentItem = items.find((i) => i.id === rundown.current_item_id) ?? null;
  const elapsedSeconds =
    rundown.is_live && rundown.current_item_started_at && now !== null
      ? Math.floor((now - new Date(rundown.current_item_started_at).getTime()) / 1000)
      : 0;
  const remainingSeconds = currentItem ? currentItem.duration_seconds - elapsedSeconds : 0;
  const showLiveTimer = rundown.is_live && now !== null;
  const totalOvertimeSeconds =
    rundown.is_live && now !== null
      ? calcTotalOvertimeSeconds({
          items,
          currentItemId: rundown.current_item_id,
          currentItemStartedAt: rundown.current_item_started_at,
          actualStartAt: rundown.actual_start_at,
          now,
        })
      : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Show rundown</CardTitle>
            <p className="text-sm text-muted-foreground">
              Cue-tijden schuiven automatisch door. Live tracking sync&apos;t mee op elk scherm dat
              deze pagina open heeft.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={
                <a
                  href={`/clock/${shareToken}${stageId ? `?stage=${stageId}` : ""}`}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              Open klok
            </Button>
            {!rundown.is_live ? (
              <Button
                size="sm"
                onClick={() => startTransition(() => startShow(projectId, stageId, rundownId))}
                disabled={items.length === 0 || isPending}
              >
                {isPending ? "Bezig…" : "Start show"}
              </Button>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                  LIVE
                </span>
                {totalOvertimeSeconds > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800">
                    Totaal opgelopen: +{formatDuration(totalOvertimeSeconds)}
                  </span>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => startTransition(() => previousCue(projectId, stageId, rundownId))}
                >
                  &larr; Vorige
                </Button>
                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={() => startTransition(() => nextCue(projectId, stageId, rundownId))}
                >
                  Volgende &rarr;
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => startTransition(() => stopShow(projectId, stageId, rundownId))}
                >
                  Stop show
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <form
          action={setRundownStartTime.bind(null, projectId, stageId, rundownId)}
          className="flex items-end gap-2 border-b pb-4"
        >
          <div className="space-y-1">
            <Label htmlFor="start_time" className="text-xs">Starttijd show</Label>
            <Input
              id="start_time"
              name="start_time"
              type="time"
              step={1}
              defaultValue={rundown.start_time}
              className="h-8 w-32 text-xs"
            />
          </div>
          <SubmitButton size="sm" variant="outline" className="h-8 text-xs">
            Opslaan
          </SubmitButton>
        </form>

        {rows.map(({ item, start, end }) => {
          const isCurrent = item.id === rundown.current_item_id;
          const instructions = item.instructions ?? [];
          return (
            <div
              key={item.id}
              ref={isCurrent ? currentRowRef : undefined}
              className={cn(
                "space-y-3 rounded-md border p-3",
                item.color && COLOR_BORDER_CLASSES[item.color],
                isCurrent && "ring-2 ring-primary bg-primary/5"
              )}
            >
              {isCurrent && showLiveTimer && (
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className={cn(remainingSeconds < 0 ? "text-red-600" : "text-primary")}>
                    {remainingSeconds < 0 ? "Over tijd: " : "Resterend: "}
                    {formatDuration(remainingSeconds)}
                  </span>
                </div>
              )}
              <form
                action={updateRundownItem.bind(null, projectId, stageId, item.id)}
                className="grid grid-cols-2 gap-2 sm:grid-cols-6"
              >
                <div className="space-y-1">
                  <Label htmlFor={`cue-${item.id}`} className="text-xs">Cue</Label>
                  <Input
                    id={`cue-${item.id}`}
                    name="cue_number"
                    defaultValue={item.cue_number}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor={`name-${item.id}`} className="text-xs">
                    Naam ({start} &ndash; {end})
                  </Label>
                  <Input
                    id={`name-${item.id}`}
                    name="name"
                    defaultValue={item.name}
                    className="h-8 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`duration-${item.id}`} className="text-xs">Duur (mm:ss)</Label>
                  <Input
                    id={`duration-${item.id}`}
                    name="duration"
                    defaultValue={formatDuration(item.duration_seconds)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`color-${item.id}`} className="text-xs">Kleur</Label>
                  <ColorSelect id={`color-${item.id}`} defaultValue={item.color} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor={`notes-${item.id}`} className="text-xs">Notities</Label>
                  <Input
                    id={`notes-${item.id}`}
                    name="notes"
                    defaultValue={item.notes}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex items-end gap-1">
                  <SubmitButton
                    formAction={moveRundownItem.bind(null, projectId, stageId, rundownId, item.id, "up")}
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs"
                    pendingText="…"
                  >
                    &uarr;
                  </SubmitButton>
                  <SubmitButton
                    formAction={moveRundownItem.bind(null, projectId, stageId, rundownId, item.id, "down")}
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs"
                    pendingText="…"
                  >
                    &darr;
                  </SubmitButton>
                </div>
                <div className="flex items-end gap-2 sm:col-span-6">
                  <SubmitButton size="sm" className="h-8 text-xs">
                    Opslaan
                  </SubmitButton>
                  <SubmitButton
                    formAction={deleteRundownItem.bind(null, projectId, stageId, rundownId, item.id)}
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs"
                  >
                    Verwijderen
                  </SubmitButton>
                </div>
              </form>

              <div className="space-y-1.5 border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground">Opdrachten per devisie</p>
                {instructions.length > 0 && (
                  <ul className="space-y-1">
                    {instructions.map((instr) => (
                      <li
                        key={instr.id}
                        className="flex items-center justify-between gap-2 rounded bg-muted/50 px-2 py-1 text-sm"
                      >
                        <span>
                          <span className="font-semibold">{instr.division}</span>
                          {" — "}
                          {instr.instruction}
                        </span>
                        <form action={deleteRundownInstruction.bind(null, projectId, stageId, instr.id)}>
                          <SubmitButton variant="ghost" size="sm" className="h-6 px-2 text-xs">
                            Verwijderen
                          </SubmitButton>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
                <form
                  action={addRundownInstruction.bind(null, projectId, stageId, item.id)}
                  className="flex flex-wrap items-end gap-2"
                >
                  <div className="space-y-1">
                    <Label htmlFor={`instr-div-${item.id}`} className="text-xs">Devisie</Label>
                    <DivisionSelect id={`instr-div-${item.id}`} />
                  </div>
                  <div className="min-w-[180px] flex-1 space-y-1">
                    <Label htmlFor={`instr-text-${item.id}`} className="text-xs">Opdracht</Label>
                    <Input
                      id={`instr-text-${item.id}`}
                      name="instruction"
                      placeholder="bv. HH 1 open zetten"
                      className="h-8 text-xs"
                      required
                    />
                  </div>
                  <SubmitButton size="sm" variant="secondary" className="h-8 shrink-0 text-xs">
                    Toevoegen
                  </SubmitButton>
                </form>
              </div>
            </div>
          );
        })}

        <form
          action={addRundownItem.bind(null, projectId, stageId, rundownId)}
          className="grid grid-cols-2 gap-2 border-t pt-4 sm:grid-cols-6"
        >
          <div className="space-y-1">
            <Label htmlFor="new-cue" className="text-xs">Cue</Label>
            <Input id="new-cue" name="cue_number" placeholder="bv. 1" className="h-8 text-xs" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="new-name" className="text-xs">Naam</Label>
            <Input id="new-name" name="name" placeholder="bv. Opening VJ set" className="h-8 text-xs" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-duration" className="text-xs">Duur (mm:ss)</Label>
            <Input id="new-duration" name="duration" placeholder="bv. 3:00" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-color" className="text-xs">Kleur</Label>
            <ColorSelect id="new-color" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="new-notes" className="text-xs">Notities</Label>
            <Input id="new-notes" name="notes" className="h-8 text-xs" />
          </div>
          <div className="flex items-end">
            <SubmitButton size="sm" className="h-8 text-xs">
              Cue toevoegen
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
