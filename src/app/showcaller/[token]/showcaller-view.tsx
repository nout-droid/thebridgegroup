"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Image from "next/image";
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
import { DIVISIONS } from "@/lib/divisions";
import { RundownChat } from "@/components/rundown-chat";
import { Footer } from "@/components/footer";
import { useTranslator } from "@/hooks/use-translator";
import { LanguageToggle } from "@/components/language-toggle";
import type { SharedRundowns } from "@/lib/types";
import { addSecondsToTime, calcTotalOvertimeSeconds, formatDuration } from "@/lib/rundown-time";
import { pickDefaultShowDate } from "@/lib/show-dates";
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

const OUTLINE_DARK = "border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white";

const STATIC_LABELS = [
  "Laden…",
  "Showcaller",
  "Projectbreed",
  "Show rundown",
  "Open klok",
  "Bezig…",
  "Start show",
  "LIVE",
  "Totaal opgelopen: +",
  "Vorige",
  "Volgende",
  "Stop show",
  "Rundown wordt klaargezet…",
  "Starttijd show",
  "Opslaan",
  "Over tijd: ",
  "Resterend: ",
  "Cue",
  "Naam",
  "Duur (mm:ss)",
  "Kleur",
  "Notities",
  "Verwijderen",
  "Opdrachten per devisie",
  "Devisie",
  "Opdracht",
  "bv. HH 1 open zetten",
  "Toevoegen",
  "bv. 1",
  "bv. Opening VJ set",
  "bv. 3:00",
  "Cue toevoegen",
  "Notes van crew",
  "Nog geen notes.",
  ...COLOR_OPTIONS.map((c) => c.label),
  ...DIVISIONS,
];

function ColorSelect({ id, defaultValue, t = (text: string) => text }: { id: string; defaultValue?: string; t?: (text: string) => string }) {
  const translatedItems = COLOR_OPTIONS.map((c) => ({ value: c.value, label: t(c.label) }));

  return (
    <Select name="color" defaultValue={defaultValue || "none"} items={translatedItems}>
      <SelectTrigger id={id} className="h-8 text-xs">
        <SelectValue placeholder={t("Geen")} />
      </SelectTrigger>
      <SelectContent>
        {COLOR_OPTIONS.map((c) => (
          <SelectItem key={c.value} value={c.value}>
            {t(c.label)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function scopeKey(stageId: string | null) {
  return stageId ?? "project";
}

export function ShowcallerView({
  token,
  restrictedStageId = null,
}: {
  token: string;
  restrictedStageId?: string | null;
}) {
  const [data, setData] = useState<SharedRundowns | null>(null);
  const [selectedScope, setSelectedScope] = useState<string>(restrictedStageId ?? "project");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const [isPending, startTransition] = useTransition();

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
  const availableDates = (scope?.rundowns ?? []).map((r) => r.show_date);
  const activeDate =
    selectedDate && availableDates.includes(selectedDate)
      ? selectedDate
      : pickDefaultShowDate(availableDates);
  const rundown = scope?.rundowns.find((r) => r.show_date === activeDate) ?? null;

  useEffect(() => {
    if (data && scope && !rundown) {
      showcallerEnsureRundown(token, scope.stage_id, activeDate).then(() => refetch());
    }
  }, [data, scope, rundown, activeDate, token, refetch]);

  function runAction(action: () => Promise<void>) {
    startTransition(() => {
      action().then(refetch);
    });
  }

  const dynamicTexts = data
    ? [
        data.project.name,
        ...data.scopes.map((s) => s.stage_name).filter((n): n is string => !!n),
        ...data.scopes.flatMap((s) =>
          s.rundowns.flatMap((r) =>
            r.items.flatMap((i) => [
              i.name,
              i.notes ?? "",
              ...i.instructions.map((instr) => instr.instruction),
            ])
          )
        ),
        ...data.notes.map((n) => n.note),
      ]
    : [];
  const { lang, setLang, t } = useTranslator(STATIC_LABELS, dynamicTexts);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm text-white/60">{t("Laden…")}</p>
      </div>
    );
  }

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
        items: rundown?.items ?? [],
        currentItemId: rundown.current_item_id,
        currentItemStartedAt: rundown.current_item_started_at,
        actualStartAt: rundown.actual_start_at,
        now: Date.now(),
      })
    : 0;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-black">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-2 font-heading text-base font-extrabold tracking-tight text-primary">
            <Image src="/logo.png" alt="The Bridge Group B.V." width={28} height={21} />
            {t(data.project.name)} &mdash; {t("Showcaller")}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!restrictedStageId && (
              <div className="flex flex-wrap gap-2">
                {data.scopes.map((s) => (
                  <Button
                    key={scopeKey(s.stage_id)}
                    size="sm"
                    variant={selectedScope === scopeKey(s.stage_id) ? "default" : "outline"}
                    className={selectedScope === scopeKey(s.stage_id) ? "" : OUTLINE_DARK}
                    onClick={() => setSelectedScope(scopeKey(s.stage_id))}
                  >
                    {s.stage_name ? t(s.stage_name) : t("Projectbreed")}
                  </Button>
                ))}
              </div>
            )}
            <LanguageToggle lang={lang} onChange={setLang} variant="dark" />
          </div>
        </div>

        {availableDates.length > 1 && (
          <div className="mx-auto flex w-full max-w-5xl flex-wrap gap-1.5 border-t border-white/10 px-6 py-2">
            {availableDates.map((d) => (
              <Button
                key={d}
                size="sm"
                variant={activeDate === d ? "default" : "outline"}
                className={cn("h-7 text-xs capitalize", activeDate === d ? "" : OUTLINE_DARK)}
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

        {rundown && (
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 border-t border-white/10 px-6 py-3">
            <p className="text-sm font-medium text-white/70">{t("Show rundown")}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className={OUTLINE_DARK}
                nativeButton={false}
                render={
                  <a
                    href={`/clock/${token}?date=${activeDate}${scope?.stage_id ? `&stage=${scope.stage_id}` : ""}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                {t("Open klok")}
              </Button>
              {!rundown.is_live ? (
                <Button
                  size="sm"
                  onClick={() => runAction(() => showcallerStartShow(token, rundown.id))}
                  disabled={!rows.length || isPending}
                >
                  {isPending ? t("Bezig…") : t("Start show")}
                </Button>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                    {t("LIVE")}
                  </span>
                  {totalOvertimeSeconds > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/20 px-2.5 py-1 text-xs font-semibold text-orange-300">
                      {t("Totaal opgelopen: +")}
                      {formatDuration(totalOvertimeSeconds)}
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className={OUTLINE_DARK}
                    disabled={isPending}
                    onClick={() => runAction(() => showcallerPreviousCue(token, rundown.id))}
                  >
                    &larr; {t("Vorige")}
                  </Button>
                  <Button
                    size="sm"
                    disabled={isPending}
                    onClick={() => runAction(() => showcallerNextCue(token, rundown.id))}
                  >
                    {t("Volgende")} &rarr;
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white/70 hover:bg-white/10 hover:text-white"
                    disabled={isPending}
                    onClick={() => runAction(() => showcallerStopShow(token, rundown.id))}
                  >
                    {t("Stop show")}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-5xl space-y-6 px-6 py-8">
        {!rundown ? (
          <p className="text-sm text-white/60">{t("Rundown wordt klaargezet…")}</p>
        ) : (
          <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
            <form
              action={(formData) =>
                runAction(() => showcallerSetStartTime(token, rundown.id, formData))
              }
              className="flex items-end gap-2 border-b border-white/10 pb-4"
            >
              <div className="space-y-1">
                <Label htmlFor="start_time" className="text-xs text-white/70">{t("Starttijd show")}</Label>
                <Input
                  id="start_time"
                  name="start_time"
                  type="time"
                  step={1}
                  defaultValue={rundown.start_time}
                  className="h-8 w-32 text-xs"
                />
              </div>
              <SubmitButton size="sm" variant="outline" className={cn("h-8 text-xs", OUTLINE_DARK)}>
                {t("Opslaan")}
              </SubmitButton>
            </form>

            {rows.map(({ item, start, end }) => {
              const isCurrent = item.id === rundown.current_item_id;
              const instructions = item.instructions ?? [];
              return (
                <div
                  key={item.id}
                  className={cn(
                    "space-y-3 rounded-md border border-white/10 bg-white/5 p-3",
                    item.color && COLOR_BORDER_CLASSES[item.color],
                    isCurrent && "ring-2 ring-primary bg-primary/10"
                  )}
                >
                  {isCurrent && (
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span className={cn(remainingSeconds < 0 ? "text-red-400" : "text-primary")}>
                        {remainingSeconds < 0 ? t("Over tijd: ") : t("Resterend: ")}
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
                      <Label htmlFor={`cue-${item.id}`} className="text-xs text-white/70">{t("Cue")}</Label>
                      <Input id={`cue-${item.id}`} name="cue_number" defaultValue={item.cue_number} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor={`name-${item.id}`} className="text-xs text-white/70">
                        {t("Naam")} ({start} &ndash; {end})
                      </Label>
                      <Input id={`name-${item.id}`} name="name" defaultValue={item.name} className="h-8 text-xs" required />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`duration-${item.id}`} className="text-xs text-white/70">{t("Duur (mm:ss)")}</Label>
                      <Input
                        id={`duration-${item.id}`}
                        name="duration"
                        defaultValue={formatDuration(item.duration_seconds)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`color-${item.id}`} className="text-xs text-white/70">{t("Kleur")}</Label>
                      <ColorSelect id={`color-${item.id}`} defaultValue={item.color} t={t} />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor={`notes-${item.id}`} className="text-xs text-white/70">{t("Notities")}</Label>
                      <Input id={`notes-${item.id}`} name="notes" defaultValue={item.notes} className="h-8 text-xs" />
                    </div>
                    <div className="flex items-end gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-white/70 hover:bg-white/10 hover:text-white"
                        disabled={isPending}
                        onClick={() => runAction(() => showcallerMoveItem(token, rundown.id, item.id, "up"))}
                      >
                        &uarr;
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-white/70 hover:bg-white/10 hover:text-white"
                        disabled={isPending}
                        onClick={() => runAction(() => showcallerMoveItem(token, rundown.id, item.id, "down"))}
                      >
                        &darr;
                      </Button>
                    </div>
                    <div className="flex items-end gap-2 sm:col-span-6">
                      <SubmitButton size="sm" className="h-8 text-xs">
                        {t("Opslaan")}
                      </SubmitButton>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-white/70 hover:bg-white/10 hover:text-white"
                        disabled={isPending}
                        onClick={() => runAction(() => showcallerDeleteItem(token, rundown.id, item.id))}
                      >
                        {t("Verwijderen")}
                      </Button>
                    </div>
                  </form>

                  <div className="space-y-1.5 border-t border-white/10 pt-3">
                    <p className="text-xs font-medium text-white/60">{t("Opdrachten per devisie")}</p>
                    {instructions.length > 0 && (
                      <ul className="space-y-1">
                        {instructions.map((instr) => (
                          <li
                            key={instr.id}
                            className="flex items-center justify-between gap-2 rounded bg-white/10 px-2 py-1 text-sm"
                          >
                            <span>
                              <span className="font-semibold">{t(instr.division)}</span>
                              {" — "}
                              {t(instr.instruction)}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-white/70 hover:bg-white/10 hover:text-white"
                              disabled={isPending}
                              onClick={() => runAction(() => showcallerDeleteInstruction(token, instr.id))}
                            >
                              {t("Verwijderen")}
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
                        <Label htmlFor={`instr-div-${item.id}`} className="text-xs text-white/70">{t("Devisie")}</Label>
                        <DivisionSelect
                          id={`instr-div-${item.id}`}
                          labels={Object.fromEntries(DIVISIONS.map((d) => [d, t(d)]))}
                        />
                      </div>
                      <div className="min-w-[180px] flex-1 space-y-1">
                        <Label htmlFor={`instr-text-${item.id}`} className="text-xs text-white/70">{t("Opdracht")}</Label>
                        <Input
                          id={`instr-text-${item.id}`}
                          name="instruction"
                          placeholder={t("bv. HH 1 open zetten")}
                          className="h-8 text-xs"
                          required
                        />
                      </div>
                      <SubmitButton size="sm" variant="secondary" className="h-8 shrink-0 text-xs">
                        {t("Toevoegen")}
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              );
            })}

            <form
              action={(formData) => runAction(() => showcallerAddItem(token, rundown.id, formData))}
              className="grid grid-cols-2 gap-2 border-t border-white/10 pt-4 sm:grid-cols-6"
            >
              <div className="space-y-1">
                <Label htmlFor="new-cue" className="text-xs text-white/70">{t("Cue")}</Label>
                <Input id="new-cue" name="cue_number" placeholder={t("bv. 1")} className="h-8 text-xs" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="new-name" className="text-xs text-white/70">{t("Naam")}</Label>
                <Input id="new-name" name="name" placeholder={t("bv. Opening VJ set")} className="h-8 text-xs" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-duration" className="text-xs text-white/70">{t("Duur (mm:ss)")}</Label>
                <Input id="new-duration" name="duration" placeholder={t("bv. 3:00")} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-color" className="text-xs text-white/70">{t("Kleur")}</Label>
                <ColorSelect id="new-color" t={t} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="new-notes" className="text-xs text-white/70">{t("Notities")}</Label>
                <Input id="new-notes" name="notes" className="h-8 text-xs" />
              </div>
              <div className="flex items-end">
                <SubmitButton size="sm" className="h-8 text-xs">
                  {t("Cue toevoegen")}
                </SubmitButton>
              </div>
            </form>
          </div>
        )}

        <RundownChat
          token={token}
          stageId={scope?.stage_id ?? null}
          messages={data.chat}
          senderLabel="Showcaller"
          audioAlert={false}
          onSent={refetch}
          t={t}
          dark
        />

        <Card className="border-white/10 bg-white/5 text-white">
          <CardHeader>
            <CardTitle className="text-base text-white">{t("Notes van crew")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {data.notes.map((note) => (
              <div key={note.id} className="rounded-md border border-white/10 p-2 text-sm">
                <span className="font-medium">{t(note.division)}:</span> {t(note.note)}
              </div>
            ))}
            {!data.notes.length && <p className="text-sm text-white/60">{t("Nog geen notes.")}</p>}
          </CardContent>
        </Card>
      </div>
      <Footer variant="dark" />
    </div>
  );
}
