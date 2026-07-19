"use client";

import { useEffect, useState } from "react";
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
import type { SharedRundowns } from "@/lib/types";
import { addSecondsToTime, calcTotalOvertimeSeconds, formatDuration } from "@/lib/rundown-time";
import { pickDefaultShowDate } from "@/lib/show-dates";
import { DIVISIONS } from "@/lib/divisions";
import { RundownChat } from "@/components/rundown-chat";
import { Footer } from "@/components/footer";

const POLL_INTERVAL_MS = 5000;

const FONT_SCALES = {
  klein: 0.875,
  normaal: 1,
  groot: 1.25,
} as const;
type FontScaleKey = keyof typeof FONT_SCALES;

const VISIBLE_DIVISIONS_KEY = "crew-rundown-visible-divisions";
const FONT_SCALE_KEY = "crew-rundown-font-scale";

function scopeKey(stageId: string | null) {
  return stageId ?? "project";
}

export function CrewRundownView({
  token,
  initialDivision,
}: {
  token: string;
  initialDivision?: string;
}) {
  const [data, setData] = useState<SharedRundowns | null>(null);
  const [selectedScope, setSelectedScope] = useState<string>("project");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [division, setDivision] = useState<string>(
    initialDivision && (DIVISIONS as readonly string[]).includes(initialDivision)
      ? initialDivision
      : DIVISIONS[0]
  );
  const [noteText, setNoteText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [, setTick] = useState(0);
  const [visibleDivisions, setVisibleDivisions] = useState<string[]>([...DIVISIONS]);
  const [fontScale, setFontScale] = useState<FontScaleKey>("normaal");

  useEffect(() => {
    try {
      const storedDivisions = localStorage.getItem(VISIBLE_DIVISIONS_KEY);
      if (storedDivisions) setVisibleDivisions(JSON.parse(storedDivisions));
      const storedScale = localStorage.getItem(FONT_SCALE_KEY);
      if (storedScale && storedScale in FONT_SCALES) setFontScale(storedScale as FontScaleKey);
    } catch {
      // localStorage niet beschikbaar (bv. privacy-modus) — gewoon bij de defaults blijven.
    }
  }, []);

  function toggleDivision(d: string) {
    setVisibleDivisions((prev) => {
      const next = prev.includes(d) ? prev.filter((v) => v !== d) : [...prev, d];
      localStorage.setItem(VISIBLE_DIVISIONS_KEY, JSON.stringify(next));
      return next;
    });
  }

  function changeFontScale(key: FontScaleKey) {
    setFontScale(key);
    localStorage.setItem(FONT_SCALE_KEY, key);
  }

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const { data: result } = await supabase.rpc("get_shared_rundowns", { p_token: token });
      if (!cancelled && result) setData(result as SharedRundowns);
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token]);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  async function refetchChat() {
    const supabase = createClient();
    const { data: result } = await supabase.rpc("get_shared_rundowns", { p_token: token });
    if (result) setData(result as SharedRundowns);
  }

  async function submitNote() {
    if (!noteText.trim()) return;
    setSubmitting(true);
    const supabase = createClient();
    const scope = data?.scopes.find((s) => scopeKey(s.stage_id) === selectedScope);
    await supabase.rpc("add_crew_note", {
      p_token: token,
      p_stage_id: scope?.stage_id ?? null,
      p_division: division,
      p_note: noteText.trim(),
    });
    setNoteText("");
    setSubmitting(false);
    const { data: result } = await supabase.rpc("get_shared_rundowns", { p_token: token });
    if (result) setData(result as SharedRundowns);
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm text-white/60">Laden&hellip;</p>
      </div>
    );
  }

  const scope =
    data.scopes.find((s) => scopeKey(s.stage_id) === selectedScope) ?? data.scopes[0] ?? null;

  const availableDates = (scope?.rundowns ?? []).map((r) => r.show_date);
  const activeDate =
    selectedDate && availableDates.includes(selectedDate)
      ? selectedDate
      : pickDefaultShowDate(availableDates);
  const rundown = scope?.rundowns.find((r) => r.show_date === activeDate) ?? null;

  let cursor = rundown?.start_time ?? "00:00:00";
  const rows = (rundown?.items ?? []).map((item) => {
    const start = cursor;
    const end = addSecondsToTime(cursor, item.duration_seconds);
    cursor = end;
    return { item, start, end };
  });

  const currentItem = rundown?.items.find((i) => i.id === rundown?.current_item_id) ?? null;
  const elapsedSeconds =
    rundown?.is_live && rundown.current_item_started_at
      ? Math.floor((Date.now() - new Date(rundown.current_item_started_at).getTime()) / 1000)
      : 0;
  const remainingSeconds = currentItem ? currentItem.duration_seconds - elapsedSeconds : 0;
  const totalOvertimeSeconds = rundown?.is_live
    ? calcTotalOvertimeSeconds({
        items: rundown.items,
        currentItemId: rundown.current_item_id,
        currentItemStartedAt: rundown.current_item_started_at,
        actualStartAt: rundown.actual_start_at,
        now: Date.now(),
      })
    : 0;
  const visibleNotes = data.notes.filter((n) => visibleDivisions.includes(n.division));

  return (
    <div className="min-h-screen bg-muted/30" style={{ zoom: FONT_SCALES[fontScale] }}>
      <header className="flex items-center gap-2 bg-black px-6 py-3 text-sm font-semibold uppercase tracking-wide text-primary">
        <Image src="/logo.png" alt="The Bridge AV Group" width={28} height={21} />
        {data.project.name} &mdash; Crew live
      </header>

      <div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-8">
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

        {availableDates.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {availableDates.map((d) => (
              <Button
                key={d}
                size="sm"
                variant={activeDate === d ? "default" : "outline"}
                className="h-7 text-xs capitalize"
                onClick={() => setSelectedDate(d)}
              >
                {new Date(`${d}T00:00:00`).toLocaleDateString("nl-NL", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </Button>
            ))}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weergave-voorkeuren</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Zichtbare devisies</Label>
              <div className="flex flex-wrap gap-1.5">
                {DIVISIONS.map((d) => (
                  <Button
                    key={d}
                    type="button"
                    size="sm"
                    variant={visibleDivisions.includes(d) ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() => toggleDivision(d)}
                  >
                    {d}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Lettergrootte</Label>
              <div className="flex gap-1.5">
                {(Object.keys(FONT_SCALES) as FontScaleKey[]).map((key) => (
                  <Button
                    key={key}
                    type="button"
                    size="sm"
                    variant={fontScale === key ? "default" : "outline"}
                    className="h-7 text-xs capitalize"
                    onClick={() => changeFontScale(key)}
                  >
                    {key}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Show rundown</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  nativeButton={false}
                  render={
                    <a
                      href={`/clock/${token}?date=${activeDate}${scope?.stage_id ? `&stage=${scope.stage_id}` : ""}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  Open klok
                </Button>
                {rundown?.is_live && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                    LIVE
                  </span>
                )}
                {totalOvertimeSeconds > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800">
                    Totaal opgelopen: +{formatDuration(totalOvertimeSeconds)}
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {!rows.length && (
              <p className="text-sm text-muted-foreground">Nog geen cues voor deze rundown.</p>
            )}
            {rows.map(({ item, start, end }) => {
              const isCurrent = item.id === rundown?.current_item_id;
              const visibleInstructions = item.instructions.filter((instr) =>
                visibleDivisions.includes(instr.division)
              );
              return (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-md border p-3 text-sm",
                    isCurrent && "ring-2 ring-primary bg-primary/5"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">
                      {item.cue_number && <span className="text-muted-foreground">#{item.cue_number} — </span>}
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {start} &ndash; {end}
                    </p>
                  </div>
                  {visibleInstructions.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {visibleInstructions.map((instr) => (
                        <li key={instr.id} className="text-xs text-muted-foreground">
                          <span className="font-semibold">{instr.division}</span> — {instr.instruction}
                        </li>
                      ))}
                    </ul>
                  )}
                  {isCurrent && (
                    <p
                      className={cn(
                        "mt-1 text-xs font-semibold",
                        remainingSeconds < 0 ? "text-red-600" : "text-primary"
                      )}
                    >
                      {remainingSeconds < 0 ? "Over tijd: " : "Resterend: "}
                      {formatDuration(remainingSeconds)}
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <RundownChat
          token={token}
          stageId={scope?.stage_id ?? null}
          messages={data.chat}
          senderLabel={division}
          audioAlert={division === "Audio"}
          onSent={refetchChat}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
            <p className="text-sm text-muted-foreground">
              Zichtbaar voor alle devisies en de showcaller.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Devisie</Label>
                <Select value={division} onValueChange={(v) => setDivision(v ?? DIVISIONS[0])}>
                  <SelectTrigger className="h-9 w-40 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIVISIONS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Note</Label>
                <Input
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="bv. Micro 3 valt uit"
                  className="h-9 text-sm"
                />
              </div>
              <Button size="sm" onClick={submitNote} disabled={submitting || !noteText.trim()}>
                Plaatsen
              </Button>
            </div>

            <ul className="space-y-1.5">
              {visibleNotes.map((note) => (
                <li key={note.id} className="rounded-md border p-2 text-sm">
                  <span className="font-medium">{note.division}:</span> {note.note}
                </li>
              ))}
              {!visibleNotes.length && (
                <p className="text-sm text-muted-foreground">
                  {data.notes.length ? "Geen notes voor de zichtbare devisies." : "Nog geen notes."}
                </p>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
