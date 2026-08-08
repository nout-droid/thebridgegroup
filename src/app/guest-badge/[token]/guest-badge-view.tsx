"use client";

import { useTranslator } from "@/hooks/use-translator";
import { LanguageToggle } from "@/components/language-toggle";
import { GUEST_RSVP_STATUS_LABELS, GUEST_TYPE_LABELS, type GuestRsvpStatus, type GuestType } from "@/lib/types";

interface GuestBadgeRow {
  name: string;
  guest_type: GuestType | string;
  rsvp_status: GuestRsvpStatus | string;
  plus_ones: number;
  project_id: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
}

const STATIC_LABELS = [
  "Badge niet gevonden of ongeldig",
  "Naam onbekend",
  "AFGEMELD",
  "RSVP",
  "Ingecheckt om",
  "Uitgecheckt om",
  "Uitchecken",
  "Inchecken",
  ...Object.values(GUEST_TYPE_LABELS),
  ...Object.values(GUEST_RSVP_STATUS_LABELS),
];

export function GuestBadgeView({
  guest,
  orgName,
  projectName,
  checkInAction,
  checkOutAction,
}: {
  guest: GuestBadgeRow | null;
  orgName: string;
  projectName: string | undefined;
  checkInAction: () => Promise<void>;
  checkOutAction: () => Promise<void>;
}) {
  const { lang, setLang, t } = useTranslator(STATIC_LABELS, []);

  if (!guest) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-red-700 p-6">
        <div className="self-end">
          <LanguageToggle lang={lang} onChange={setLang} variant="dark" />
        </div>
        <p className="text-lg font-semibold text-white">{t("Badge niet gevonden of ongeldig")}</p>
      </div>
    );
  }

  const declined = guest.rsvp_status === "afgemeld";
  const typeLabel = t(GUEST_TYPE_LABELS[guest.guest_type as GuestType] ?? guest.guest_type);
  const rsvpLabel = t(GUEST_RSVP_STATUS_LABELS[guest.rsvp_status as GuestRsvpStatus] ?? guest.rsvp_status);

  return (
    <div
      className={`flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-white ${
        declined ? "bg-red-700" : "bg-black"
      }`}
    >
      <div className="flex w-full max-w-sm items-center justify-end">
        <LanguageToggle lang={lang} onChange={setLang} variant="dark" />
      </div>
      <div className="text-center">
        <p className="text-sm uppercase tracking-widest text-[#7dff43]">{orgName}</p>
        <p className="mt-1 text-xs text-white/60">{projectName}</p>
      </div>

      {declined && (
        <div className="rounded-md bg-white px-6 py-3 text-center">
          <p className="text-xl font-bold text-red-700">{t("AFGEMELD")}</p>
        </div>
      )}

      <div className="w-full max-w-sm space-y-4 rounded-lg bg-white p-6 text-black">
        <div>
          <p className="text-2xl font-bold">{guest.name || t("Naam onbekend")}</p>
          <p className="text-sm text-muted-foreground">
            {typeLabel}
            {guest.plus_ones > 0 && ` · +${guest.plus_ones}`}
          </p>
        </div>

        <div
          className={`rounded-md p-3 text-center font-semibold ${
            declined ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
          }`}
        >
          {t("RSVP")}: {rsvpLabel}
        </div>

        {!declined && (
          <div className="space-y-2 border-t pt-3">
            {guest.checked_in_at ? (
              <>
                <p className="rounded-md bg-green-100 p-3 text-center font-semibold text-green-800">
                  {t("Ingecheckt om")}{" "}
                  {new Date(guest.checked_in_at).toLocaleTimeString("nl-NL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {guest.checked_out_at ? (
                  <p className="rounded-md bg-muted p-3 text-center font-semibold text-muted-foreground">
                    {t("Uitgecheckt om")}{" "}
                    {new Date(guest.checked_out_at).toLocaleTimeString("nl-NL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                ) : (
                  <form action={checkOutAction}>
                    <button
                      type="submit"
                      className="w-full rounded-md border border-primary py-3 text-center font-semibold text-primary"
                    >
                      {t("Uitchecken")}
                    </button>
                  </form>
                )}
              </>
            ) : (
              <form action={checkInAction}>
                <button
                  type="submit"
                  className="w-full rounded-md bg-primary py-3 text-center font-semibold text-primary-foreground"
                >
                  {t("Inchecken")}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
