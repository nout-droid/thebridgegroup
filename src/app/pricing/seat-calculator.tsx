"use client";

import { useState } from "react";
import type { PricingTierKey } from "@/lib/pricing";

export function SeatCalculator({
  tier,
  pricePerSeat,
  minSeats,
  maxSeats,
  defaultSeats,
  startLabel,
  perSeatLabel,
  totalLabel,
  earlyAdopter,
}: {
  tier: PricingTierKey;
  pricePerSeat: number;
  minSeats: number;
  maxSeats: number | null;
  defaultSeats: number;
  startLabel: string;
  perSeatLabel: string;
  totalLabel: string;
  earlyAdopter?: boolean;
}) {
  const [seats, setSeats] = useState(defaultSeats);

  const clamp = (value: number) => {
    let next = Number.isFinite(value) ? Math.round(value) : minSeats;
    next = Math.max(minSeats, next);
    if (maxSeats !== null) next = Math.min(maxSeats, next);
    return next;
  };

  const total = seats * pricePerSeat;
  const discountedTotal = earlyAdopter ? total / 2 : total;

  // Altijd naar de checkout-route, ongeacht of Stripe hier client-side "geconfigureerd"
  // lijkt — die route kent zelf elk geval al netjes af: niet ingelogd -> /login, geen
  // Stripe-key/prijs-ID -> duidelijke foutmelding op /team. Eerder linkte dit naar /signup
  // zodra checkout niet beschikbaar leek, wat een bestaande, al ingelogde accounthouder
  // straal voorbij zijn eigen account naar een nieuw-account-formulier stuurde.
  const href = `/api/stripe/checkout?tier=${tier}&seats=${seats}${earlyAdopter ? "&early_adopter=1" : ""}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label htmlFor={`seats-${tier}${earlyAdopter ? "-ea" : ""}`} className="text-sm text-white/70">
          {perSeatLabel}
        </label>
        <input
          id={`seats-${tier}${earlyAdopter ? "-ea" : ""}`}
          type="number"
          min={minSeats}
          max={maxSeats ?? undefined}
          value={seats}
          onChange={(e) => setSeats(clamp(Number(e.target.value)))}
          className="w-16 rounded-md border border-white/20 bg-white/5 px-2 py-1 text-center text-sm text-white"
        />
      </div>
      <p className="text-sm text-white/60">
        {totalLabel}{" "}
        {earlyAdopter && (
          <span className="text-white/40 line-through">&euro; {total.toLocaleString("en-GB")}</span>
        )}{" "}
        <span className="font-semibold text-white">
          &euro; {discountedTotal.toLocaleString("en-GB")}
        </span>{" "}
        / month
      </p>
      <a
        href={href}
        className="block rounded-md bg-primary px-4 py-2.5 text-center text-sm font-semibold uppercase tracking-wide text-black hover:opacity-90"
      >
        {startLabel}
      </a>
    </div>
  );
}
