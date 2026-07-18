"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DivisionSelect } from "@/components/division-select";
import type { SharedRundowns } from "@/lib/types";
import { addSecondsToTime, calcTotalOvertimeSeconds, formatDuration } from "@/lib/rundown-time";
import {
  showcallerAddInstruction,
  showcallerAddItem,
  showcallerDeleteInstruction,
  showcallerDeleteItem,
  showcallerEnsureRundown,
  showcallerMoveItem,
  showcallerNextCue,
  showcallerPreviousCue,
  showcallerSetStartTime,
  showcallerStartShow,
  showcallerStopShow,
  showcallerUpdateItem,
} from "./showcaller-actions";

const POLL_INTERVAL_MS = 3000;

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
    <Select name="color" defaultValue={defaultValue || "none"}>
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

function scopeKey(stageId: string | null) {
  return stageId ?? "project";
}

export function ShowcallerView({ token }: { token: string }) {
  const [data, setData] = useState<SharedRundowns | null>(null);
  const [selectedScope, setSelectedScope] = useState<string>("project");
  const [, setTick] = useState(0);
  const [, startTransition] = useTransition();

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
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const scope = data?.scopes.find((s) => scopeKey(s.stage_id) === selectedScope) ?? null;

  useEffect(() => {
    if (data && scope && !scope.rundown) {
      showcallerEnsureRundown(token, scope.stage_id).then(() => refetch());
    }
  }, [data, scope, token, refetch]);

  function runAction(action: () => Promise<void>) {
    startTransition(() => {
      action().then(refetch);
    });
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm text-white/60">Laden&hellip;</p>
      </div>
    );
  }

  const rundown = scope?.rundown;
  let cursor = rundown?.start_time ?? "00:00:00";
  const rows = (scope?.items ?? []).map((item) => {
    const start = cursor;
    const end = addSecondsToTime(cursor, item.duration_seconds);
    cursor = end;
    return { item, start, end };
  });

  const currentItem = scope?.items.find((i) => i.id === rundown?.current_item_id) ?? null;
  const elapsedSeconds =
    rundown?.is_live && rundown.current_item_started_at
      ? Math.floor((Date.now() - new Date(rundown.current_item_started_at).getTime()) / 1000)
      : 0;
  const remainingSeconds = currentItem ? currentItem.duration_seconds - elapsedSeconds : 0;
  const totalOvertimeSeconds = rundown?.is_live
    ? calcTotalOvertimeSeconds({
        items: scope?.items ?? [],
        currentItemId: rundown.current_item_id,
        currentItemStartedAt: rundown.current_item_started_at,
        actualStartAt: rundown.actual_start_at,
        now: Date.now(),
      })
    : 0;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="flex items-center gap-2 bg-black px-6 py-3 text-sm font-semibold uppercase tracking-wide text-primary">
        <Image src="/logo.png" alt="The Bridge AV Group" width={28} height={21} />
        {data.project.name} &mdash; Showcaller
      </header>

      <div className="mx-auto w-full max-w-5xl space-y-6 px-6 py-8">
        <div className="flex flex-wrap gap-2">
          {data.scopes.map((s) => (
            <Button
              key={scopeKey(s.stage_id)}
              size="sm"
              variant={selectedScope === scopeKey(s.stage_id) ? "default" : "outline"}
              onClick={() => setSelectedScope(scopeKey(s.stage_id))}
            >
              {s.stage_name ?? "Projectbreed"}
            </Button>
          ))}
        </div>

        {!rundown ? (
          <p className="text-sm text-muted-foreground">Rundown wordt klaargezet&hellip;</p>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base">Show rundown</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    nativeButton={false}
                    render={
                      <a
                        href={`/clock/${token}${scope?.stage_id ? `?stage=${scope.stage_id}` : ""}`}
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
                      onClick={() => runAction(() => showcallerStartShow(token, rundown.id))}
                      disabled={!rows.length}
                    >
                      Start show
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
                        onClick={() => runAction(() => showcallerPreviousCue(token, rundown.id))}
                      >
                        &larr; Vorige
                      </Button>
                      <Button size="sm" onClick={() => runAction(() => showcallerNextCue(token, rundown.id))}>
                        Volgende &rarr;
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => runAction(() => showcallerStopShow(token, rundown.id))}
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
                action={(formData) =>
                  runAction(() => showcallerSetStartTime(token, rundown.id, formData))
                }
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
                <Button type="submit" size="sm" variant="outline" className="h-8 text-xs">
                  Opslaan
                </Button>
              </form>

              {rows.map(({ item, start, end }) => {
                const isCurrent = item.id === rundown.current_item_id;
                const instructions = item.instructions ?? [];
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "space-y-3 rounded-md border p-3",
                      item.color && COLOR_BORDER_CLASSES[item.color],
                      isCurrent && "ring-2 ring-primary bg-primary/5"
                    )}
                  >
                    {isCurrent && (
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <span className={cn(remainingSeconds < 0 ? "text-red-600" : "text-primary")}>
                          {remainingSeconds < 0 ? "Over tijd: " : "Resterend: "}
                          {formatDuration(remainingSeconds)}
                        </span>
                      </div>
                    )}
                    <form
                      action={(formData) =>
                        runAction(() => showcallerUpdateItem(token, item.id, formData))
                      }
                      className="grid grid-cols-2 gap-2 sm:grid-cols-6"
                    >
                      <div className="space-y-1">
                        <Label htmlFor={`cue-${item.id}`} className="text-xs">Cue</Label>
                        <Input id={`cue-${item.id}`} name="cue_number" defaultValue={item.cue_number} className="h-8 text-xs" />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label htmlFor={`name-${item.id}`} className="text-xs">
                          Naam ({start} &ndash; {end})
                        </Label>
                        <Input id={`name-${item.id}`} name="name" defaultValue={item.name} className="h-8 text-xs" required />
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
                        <Input id={`notes-${item.id}`} name="notes" defaultValue={item.notes} className="h-8 text-xs" />
                      </div>
                      <div className="flex items-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={() => runAction(() => showcallerMoveItem(token, rundown.id, item.id, "up"))}
                        >
                          &uarr;
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={() => runAction(() => showcallerMoveItem(token, rundown.id, item.id, "down"))}
                        >
                          &darr;
                        </Button>
                      </div>
                      <div className="flex items-end gap-2 sm:col-span-6">
                        <Button type="submit" size="sm" className="h-8 text-xs">
                          Opslaan
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={() => runAction(() => showcallerDeleteItem(token, rundown.id, item.id))}
                        >
                          Verwijderen
                        </Button>
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
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => runAction(() => showcallerDeleteInstruction(token, instr.id))}
                              >
                                Verwijderen
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <form
                        action={(formData) =>
                          runAction(() => showcallerAddInstruction(token, item.id, formData))
                        }
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
                        <Button type="submit" size="sm" variant="secondary" className="h-8 shrink-0 text-xs">
                          Toevoegen
                        </Button>
                      </form>
                    </div>
                  </div>
                );
              })}

              <form
                action={(formData) => runAction(() => showcallerAddItem(token, rundown.id, formData))}
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
                  <Button type="submit" size="sm" className="h-8 text-xs">
                    Cue toevoegen
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes van crew</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {data.notes.map((note) => (
              <div key={note.id} className="rounded-md border p-2 text-sm">
                <span className="font-medium">{note.division}:</span> {note.note}
              </div>
            ))}
            {!data.notes.length && <p className="text-sm text-muted-foreground">Nog geen notes.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
