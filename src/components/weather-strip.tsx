"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { isBadWeather } from "@/lib/weather-conditions";

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
  contingencyLabel = "Plan B bij slecht weer",
  dark = false,
}: {
  token: string;
  activeDate: string | null;
  rainLabel?: string;
  contingencyLabel?: string;
  dark?: boolean;
}) {
  const [days, setDays] = useState<DailyForecast[] | null>(null);
  const [isOutdoor, setIsOutdoor] = useState(false);
  const [contingencyPlan, setContingencyPlan] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/weather/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setDays(data.days ?? []);
        setIsOutdoor(Boolean(data.isOutdoor));
        setContingencyPlan(data.contingencyPlan ?? "");
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

  const showContingency = isOutdoor && contingencyPlan && isBadWeather(forecast);

  return (
    <div className="flex flex-col items-start gap-1.5">
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
      {showContingency && (
        <div className="max-w-md rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-500">
          <span className="font-semibold">{contingencyLabel}: </span>
          {contingencyPlan}
        </div>
      )}
    </div>
  );
}
