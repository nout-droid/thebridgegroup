"use client";

import { useTranslator } from "@/hooks/use-translator";
import { LanguageToggle } from "@/components/language-toggle";

interface RsvpGuestRow {
  name: string;
  plus_ones: number;
  plus_one_name: string;
  dietary_notes: string;
  rsvp_status: string;
  responded_at: string | null;
  project_id: string;
}

const STATIC_LABELS = [
  "Uitnodiging niet gevonden of ongeldig",
  "Hoi",
  "daar",
  "Jouw reactie:",
  "Afgemeld",
  "Bevestigd",
  "Reactie wijzigen kan hieronder nog steeds.",
  "Ben je erbij?",
  "Naam introducee(s)",
  "Dieetwensen / allergieën (optioneel)",
  "Ik kom",
  "Ik kan niet",
];

export function RsvpView({
  guest,
  orgName,
  projectName,
  eventDate,
  token,
  submitAction,
}: {
  guest: RsvpGuestRow | null;
  orgName: string;
  projectName: string | undefined;
  eventDate: string | null | undefined;
  token: string;
  submitAction: (formData: FormData) => Promise<void>;
}) {
  const { lang, setLang, t } = useTranslator(STATIC_LABELS, []);

  if (!guest) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black p-6">
        <div className="self-end">
          <LanguageToggle lang={lang} onChange={setLang} variant="dark" />
        </div>
        <p className="text-lg font-semibold text-white">{t("Uitnodiging niet gevonden of ongeldig")}</p>
      </div>
    );
  }

  const responded = Boolean(guest.responded_at);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black p-6 text-white">
      <div className="flex w-full max-w-sm items-center justify-end">
        <LanguageToggle lang={lang} onChange={setLang} variant="dark" />
      </div>
      <div className="text-center">
        <p className="text-sm uppercase tracking-widest text-[#7dff43]">{orgName}</p>
        <p className="mt-1 text-xl font-bold">{projectName}</p>
        {eventDate && <p className="text-sm text-white/60">{eventDate}</p>}
      </div>

      <div className="w-full max-w-sm space-y-4 rounded-lg bg-white p-6 text-black">
        <p className="text-lg font-semibold">
          {t("Hoi")} {guest.name || t("daar")},
        </p>

        {responded ? (
          <div className="space-y-3">
            <div
              className={`rounded-md p-3 text-center font-semibold ${
                guest.rsvp_status === "afgemeld" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
              }`}
            >
              {t("Jouw reactie:")} {guest.rsvp_status === "afgemeld" ? t("Afgemeld") : t("Bevestigd")}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("Reactie wijzigen kan hieronder nog steeds.")}
            </p>
            <RsvpForm token={token} guest={guest} submitAction={submitAction} t={t} />
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{t("Ben je erbij?")}</p>
            <RsvpForm token={token} guest={guest} submitAction={submitAction} t={t} />
          </>
        )}
      </div>
    </div>
  );
}

function RsvpForm({
  guest,
  submitAction,
  t,
}: {
  token: string;
  guest: RsvpGuestRow;
  submitAction: (formData: FormData) => Promise<void>;
  t: (text: string) => string;
}) {
  return (
    <form action={submitAction} className="space-y-3">
      {guest.plus_ones > 0 && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t("Naam introducee(s)")}</label>
          <input
            type="text"
            name="plus_one_name"
            defaultValue={guest.plus_one_name}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      )}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          {t("Dieetwensen / allergieën (optioneel)")}
        </label>
        <textarea
          name="dietary_notes"
          defaultValue={guest.dietary_notes}
          rows={2}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          name="status"
          value="bevestigd"
          className="flex-1 rounded-md bg-primary py-3 text-center font-semibold text-primary-foreground"
        >
          {t("Ik kom")}
        </button>
        <button
          type="submit"
          name="status"
          value="afgemeld"
          className="flex-1 rounded-md border border-red-600 py-3 text-center font-semibold text-red-600"
        >
          {t("Ik kan niet")}
        </button>
      </div>
    </form>
  );
}
