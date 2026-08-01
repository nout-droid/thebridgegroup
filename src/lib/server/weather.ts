import "server-only";

export interface DailyForecast {
  date: string;
  tempMin: number;
  tempMax: number;
  precipitationProbability: number;
  weatherCode: number;
}

// Gratis Open-Meteo API, geen API-key nodig (in tegenstelling tot DeepL/Resend/Stripe elders
// in deze app) — geocoding + forecast draaien dus altijd, ook zonder configuratie.
const geocodeCache = new Map<string, { lat: number; lon: number } | null>();

async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  const key = address.trim().toLowerCase();
  if (geocodeCache.has(key)) return geocodeCache.get(key) ?? null;

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(address)}&count=1&language=nl`;
    const res = await fetch(url);
    if (!res.ok) {
      geocodeCache.set(key, null);
      return null;
    }
    const data = await res.json();
    const result = data?.results?.[0];
    const coords = result ? { lat: result.latitude, lon: result.longitude } : null;
    geocodeCache.set(key, coords);
    return coords;
  } catch {
    geocodeCache.set(key, null);
    return null;
  }
}

export async function getWeatherForecast(address: string): Promise<DailyForecast[] | null> {
  if (!address.trim()) return null;

  const coords = await geocodeAddress(address);
  if (!coords) return null;

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode` +
      `&timezone=auto&forecast_days=16`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;

    const data = await res.json();
    const dates: string[] = data?.daily?.time ?? [];
    return dates.map((date, i) => ({
      date,
      tempMin: Math.round(data.daily.temperature_2m_min[i]),
      tempMax: Math.round(data.daily.temperature_2m_max[i]),
      precipitationProbability: Math.round(data.daily.precipitation_probability_max[i]),
      weatherCode: data.daily.weathercode[i],
    }));
  } catch {
    return null;
  }
}
