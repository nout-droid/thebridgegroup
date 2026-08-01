"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface DailyForecast {
  date: string;
  tempMin: number;
  tempMax: number;
  precipitationProbability: number;
  weatherCode: number;
}

function weatherIcon(code: number) {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 51 && code <= 55) return "🌦️";
  if (code >= 61 && code <= 65) return "🌧️";
  if (code >= 71 && code <= 75) return "🌨️";
  if (code >= 80 && code <= 82) return "🌧️";
  if (code >= 95) return "⛈️";
  return "⛅";
}

export function WeatherStrip({
  token,
  activeDate,
  rainLabel = "regen",
  dark = false,
}: {
  token: string;
  activeDate: string | null;
  rainLabel?: string;
  dark?: boolean;
}) {
  const [days, setDays] = useState<DailyForecast[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/weather/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setDays(data.days ?? []);
      })
      .catch(() => {
        if (!cancelled) setDays([]);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!days || !activeDate) return null;
  const forecast = days.find((d) => d.date === activeDate);
  if (!forecast) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm",
        dark ? "border border-white/10 bg-white/5 text-white" : "border bg-muted/40"
      )}
    >
      <span className="text-base">{weatherIcon(forecast.weatherCode)}</span>
      <span>
        {forecast.tempMin}&deg;–{forecast.tempMax}&deg;C
      </span>
      <span className={dark ? "text-white/60" : "text-muted-foreground"}>
        {forecast.precipitationProbability}% {rainLabel}
      </span>
    </div>
  );
}
