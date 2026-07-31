"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslator } from "@/hooks/use-translator";
import { LanguageToggle } from "@/components/language-toggle";
import type {
  AttendeeAgendaItem,
  AttendeeHome,
  AttendeePublicProfile,
  AttendeeSavedProfile,
} from "@/lib/types";
import { uploadAttendeePhoto, logoutAttendee } from "./actions";

const POLL_INTERVAL_MS = 8000;

const TABS = [
  { key: "profile", label: "Mijn profiel" },
  { key: "agenda", label: "Agenda" },
  { key: "directory", label: "Netwerk" },
  { key: "saved", label: "Opgeslagen" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const STATIC_LABELS = [
  "Mijn profiel",
  "Agenda",
  "Netwerk",
  "Opgeslagen",
  "Uitloggen",
  "Naam",
  "E-mailadres",
  "Bedrijf",
  "Functie",
  "Korte bio",
  "Zichtbaar in het netwerk",
  "Zet dit aan om je naam, bedrijf, functie en bio te delen met andere aanwezigen die ook hebben ingestemd. Je e-mailadres blijft altijd privé.",
  "Profielfoto",
  "Wijzigen",
  "Opslaan",
  "Bezig met opslaan…",
  "Opgeslagen.",
  "Opslaan is niet gelukt.",
  "Nog geen programma-onderdelen bekend.",
  "Je bent nog niet zichtbaar in het netwerk.",
  "Zet \"Zichtbaar in het netwerk\" aan op je profiel om andere aanwezigen te zien en jezelf zichtbaar te maken voor hen.",
  "Ga naar mijn profiel",
  "Nog geen andere aanwezigen zichtbaar.",
  "Bewaren",
  "Bewaard",
  "Verwijderen",
  "Je hebt nog niemand bewaard.",
  "Blader door het netwerk en bewaar mensen die je wilt onthouden.",
];

type Toast = { text: string; kind: "success" | "error" } | null;

export function AttendeeView({
  token,
  attendeeId,
  organizationName,
}: {
  token: string;
  attendeeId: string;
  organizationName: string;
}) {
  const router = useRouter();
  const [home, setHome] = useState<AttendeeHome | null>(null);
  const [directory, setDirectory] = useState<AttendeePublicProfile[] | null>(null);
  const [saved, setSaved] = useState<AttendeeSavedProfile[] | null>(null);
  const [tab, setTab] = useState<TabKey>("profile");
  const [toast, setToast] = useState<Toast>(null);
  const [isPending, startTransition] = useTransition();
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const { data } = await supabase.rpc("get_attendee_home", { p_attendee_id: attendeeId });
      if (!cancelled && data) setHome(data as AttendeeHome);

      const { data: savedData } = await supabase.rpc("get_attendee_saved_contacts", {
        p_attendee_id: attendeeId,
      });
      if (!cancelled && savedData) setSaved(savedData as AttendeeSavedProfile[]);
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [attendeeId]);

  useEffect(() => {
    // Niet zelf opted in? Dan tonen we sowieso de opt-in-prompt i.p.v. de directory (zie
    // render hieronder) — geen fetch nodig en geen setState hier vereist.
    if (!home?.attendee.networking_opt_in) return;

    const supabase = createClient();
    let cancelled = false;
    const projectId = home.project.id;

    async function loadDirectory() {
      const { data } = await supabase.rpc("get_attendee_directory", {
        p_project_id: projectId,
        p_requesting_attendee_id: attendeeId,
      });
      if (!cancelled && data) setDirectory(data as AttendeePublicProfile[]);
    }

    loadDirectory();
    const interval = setInterval(loadDirectory, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [home?.attendee.networking_opt_in, home?.project.id, attendeeId]);

  const dynamicTexts = useMemo(() => {
    const texts: string[] = [organizationName];
    if (home) {
      texts.push(home.project.name, home.attendee.bio ?? "", home.attendee.company ?? "", home.attendee.title ?? "");
      home.agenda.forEach((item) => {
        texts.push(item.activity, item.stage_name ?? "");
      });
    }
    (directory ?? []).forEach((p) => texts.push(p.name, p.company ?? "", p.title ?? "", p.bio ?? ""));
    (saved ?? []).forEach((p) => texts.push(p.name, p.company ?? "", p.title ?? "", p.bio ?? ""));
    return texts;
  }, [organizationName, home, directory, saved]);

  const { lang, setLang, t } = useTranslator(STATIC_LABELS, dynamicTexts);

  function showToast(text: string, kind: "success" | "error") {
    setToast({ text, kind });
    setTimeout(() => setToast(null), 3000);
  }

  async function refreshHome() {
    const supabase = createClient();
    const { data } = await supabase.rpc("get_attendee_home", { p_attendee_id: attendeeId });
    if (data) setHome(data as AttendeeHome);
  }

  function handleProfileSubmit(formData: FormData) {
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.rpc("update_attendee_profile", {
        p_attendee_id: attendeeId,
        p_bio: String(formData.get("bio") ?? ""),
        p_company: String(formData.get("company") ?? ""),
        p_title: String(formData.get("title") ?? ""),
        p_networking_opt_in: formData.get("networking_opt_in") === "on",
      });
      if (error) {
        showToast(t("Opslaan is niet gelukt."), "error");
        return;
      }
      await refreshHome();
      showToast(t("Opgeslagen."), "success");
    });
  }

  function handlePhotoChange(file: File | undefined) {
    if (!file) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadAttendeePhoto(token, formData);
      if (result.ok) {
        await refreshHome();
        showToast(t("Opgeslagen."), "success");
      }
    });
  }

  function toggleSave(saved_: boolean, targetId: string) {
    startTransition(async () => {
      const supabase = createClient();
      if (saved_) {
        await supabase.rpc("unsave_attendee_contact", {
          p_attendee_id: attendeeId,
          p_saved_attendee_id: targetId,
        });
      } else {
        await supabase.rpc("save_attendee_contact", {
          p_attendee_id: attendeeId,
          p_saved_attendee_id: targetId,
        });
      }
      const { data: savedData } = await supabase.rpc("get_attendee_saved_contacts", {
        p_attendee_id: attendeeId,
      });
      if (savedData) setSaved(savedData as AttendeeSavedProfile[]);
    });
  }

  function handleLogout() {
    startTransition(async () => {
      await logoutAttendee(token);
      router.push(`/attendee/${token}`);
      router.refresh();
    });
  }

  const savedIds = useMemo(() => new Set((saved ?? []).map((p) => p.id)), [saved]);

  if (!home) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm text-white/60">…</p>
      </div>
    );
  }

  return (
    <div>
      <header className="flex items-center justify-between gap-2 bg-black px-6 py-3 text-primary">
        <div className="flex items-center gap-2 font-heading text-base font-extrabold tracking-tight">
          <Image src="/logo.png" alt={organizationName} width={28} height={21} />
          {t(organizationName)}
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle lang={lang} onChange={setLang} variant="dark" />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-white/80 hover:bg-white/10 hover:text-white"
            onClick={handleLogout}
          >
            {t("Uitloggen")}
          </Button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl space-y-6 px-6 py-8">
        <div>
          <h1 className="font-heading text-3xl font-extrabold uppercase tracking-tight">{t(home.project.name)}</h1>
          {home.project.event_date && <p className="text-muted-foreground">{home.project.event_date}</p>}
        </div>

        {toast && (
          <p
            className={`rounded-md p-3 text-center text-sm ${
              toast.kind === "success" ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"
            }`}
          >
            {toast.text}
          </p>
        )}

        <div className="flex gap-1 border-b">
          {TABS.map((tb) => (
            <button
              key={tb.key}
              type="button"
              onClick={() => setTab(tb.key)}
              className={`px-3 py-2 text-sm font-medium ${
                tab === tb.key ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"
              }`}
            >
              {t(tb.label)}
            </button>
          ))}
        </div>

        {tab === "profile" && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-full border bg-muted">
                {home.attendee.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={home.attendee.photo_url} alt={home.attendee.name} className="h-full w-full object-cover" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">{t("Profielfoto")}</p>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePhotoChange(e.target.files?.[0])}
                />
                <Button type="button" size="sm" variant="outline" onClick={() => photoInputRef.current?.click()}>
                  {t("Wijzigen")}
                </Button>
              </div>
            </div>

            <form action={handleProfileSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t("Naam")}</Label>
                <Input value={home.attendee.name} disabled />
              </div>
              <div className="space-y-1.5">
                <Label>{t("E-mailadres")}</Label>
                <Input value={home.attendee.email ?? ""} disabled />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="company">{t("Bedrijf")}</Label>
                <Input id="company" name="company" defaultValue={home.attendee.company ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="title">{t("Functie")}</Label>
                <Input id="title" name="title" defaultValue={home.attendee.title ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bio">{t("Korte bio")}</Label>
                <Textarea id="bio" name="bio" rows={3} defaultValue={home.attendee.bio ?? ""} />
              </div>
              <label className="flex items-start gap-2 rounded-md border p-3 text-sm">
                <input
                  type="checkbox"
                  name="networking_opt_in"
                  defaultChecked={home.attendee.networking_opt_in}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">{t("Zichtbaar in het netwerk")}</span>
                  <br />
                  <span className="text-xs text-muted-foreground">
                    {t(
                      "Zet dit aan om je naam, bedrijf, functie en bio te delen met andere aanwezigen die ook hebben ingestemd. Je e-mailadres blijft altijd privé."
                    )}
                  </span>
                </span>
              </label>
              <Button type="submit" disabled={isPending}>
                {isPending ? t("Bezig met opslaan…") : t("Opslaan")}
              </Button>
            </form>
          </div>
        )}

        {tab === "agenda" && (
          <div className="space-y-2">
            {home.agenda.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("Nog geen programma-onderdelen bekend.")}</p>
            ) : (
              <AgendaList items={home.agenda} t={t} />
            )}
          </div>
        )}

        {tab === "directory" && (
          <div className="space-y-2">
            {!home.attendee.networking_opt_in ? (
              <div className="space-y-3 rounded-md border p-4 text-sm">
                <p className="font-medium">{t("Je bent nog niet zichtbaar in het netwerk.")}</p>
                <p className="text-muted-foreground">
                  {t(
                    'Zet "Zichtbaar in het netwerk" aan op je profiel om andere aanwezigen te zien en jezelf zichtbaar te maken voor hen.'
                  )}
                </p>
                <Button type="button" size="sm" onClick={() => setTab("profile")}>
                  {t("Ga naar mijn profiel")}
                </Button>
              </div>
            ) : !directory || directory.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("Nog geen andere aanwezigen zichtbaar.")}</p>
            ) : (
              <ul className="space-y-2">
                {directory.map((p) => (
                  <ProfileCard
                    key={p.id}
                    profile={p}
                    saved={savedIds.has(p.id)}
                    onToggleSave={() => toggleSave(savedIds.has(p.id), p.id)}
                    t={t}
                  />
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "saved" && (
          <div className="space-y-2">
            {!saved || saved.length === 0 ? (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t("Je hebt nog niemand bewaard.")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("Blader door het netwerk en bewaar mensen die je wilt onthouden.")}
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {saved.map((p) => (
                  <ProfileCard key={p.id} profile={p} saved onToggleSave={() => toggleSave(true, p.id)} t={t} />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AgendaList({ items, t }: { items: AttendeeAgendaItem[]; t: (text: string) => string }) {
  const groups: { date: string; items: AttendeeAgendaItem[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.date === item.activity_date) last.items.push(item);
    else groups.push({ date: item.activity_date, items: [item] });
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.date}>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.date}</p>
          <ul className="space-y-1.5 text-sm">
            {group.items.map((item) => (
              <li key={item.id} className="rounded-md border p-2">
                <span className="text-muted-foreground">{item.activity_time}</span>{" "}
                {item.stage_name && `[${t(item.stage_name)}] `}
                {t(item.activity)}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ProfileCard({
  profile,
  saved,
  onToggleSave,
  t,
}: {
  profile: AttendeePublicProfile;
  saved: boolean;
  onToggleSave: () => void;
  t: (text: string) => string;
}) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border bg-muted">
          {profile.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photo_url} alt={profile.name} className="h-full w-full object-cover" />
          )}
        </div>
        <div>
          <p className="font-medium">{t(profile.name)}</p>
          <p className="text-xs text-muted-foreground">
            {[profile.title, profile.company].filter(Boolean).map((x) => t(x as string)).join(" · ")}
          </p>
          {profile.bio && <p className="mt-1 text-xs">{t(profile.bio)}</p>}
        </div>
      </div>
      <Button type="button" size="sm" variant={saved ? "secondary" : "outline"} onClick={onToggleSave}>
        {saved ? t("Verwijderen") : t("Bewaren")}
      </Button>
    </li>
  );
}
