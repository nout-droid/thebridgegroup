"use client";

import { useState } from "react";
import type { PricingTierKey } from "@/lib/pricing";

export function SeatCalculator({
  tier,
  pricePerSeat,
  minSeats,
  maxSeats,
  defaultSeats,
  checkoutEnabled,
  startLabel,
  perSeatLabel,
  totalLabel,
}: {
  tier: PricingTierKey;
  pricePerSeat: number;
  minSeats: number;
  maxSeats: number | null;
  defaultSeats: number;
  checkoutEnabled: boolean;
  startLabel: string;
  perSeatLabel: string;
  totalLabel: string;
}) {
  const [seats, setSeats] = useState(defaultSeats);

  const clamp = (value: number) => {
    let next = Number.isFinite(value) ? Math.round(value) : minSeats;
    next = Math.max(minSeats, next);
    if (maxSeats !== null) next = Math.min(maxSeats, next);
    return next;
  };

  const total = seats * pricePerSeat;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label htmlFor={`seats-${tier}`} className="text-sm text-white/70">
          {perSeatLabel}
        </label>
        <input
          id={`seats-${tier}`}
          type="number"
          min={minSeats}
          max={maxSeats ?? undefined}
          value={seats}
          onChange={(e) => setSeats(clamp(Number(e.target.value)))}
          className="w-16 rounded-md border border-white/20 bg-white/5 px-2 py-1 text-center text-sm text-white"
        />
      </div>
      <p className="text-sm text-white/60">
        {totalLabel} <span className="font-semibold text-white">&euro; {total.toLocaleString("en-GB")}</span>{" "}
        / month
      </p>
      <a
        href={checkoutEnabled ? `/api/stripe/checkout?tier=${tier}&seats=${seats}` : "/signup"}
        className="block rounded-md bg-primary px-4 py-2.5 text-center text-sm font-semibold uppercase tracking-wide text-black hover:opacity-90"
      >
        {startLabel}
      </a>
    </div>
  );
}
