import "server-only";

// Zelfde gratis Open-Meteo geocoding als src/lib/server/weather.ts (geen API-key nodig,
// in tegenstelling tot een betaalde routing-API zoals Google Maps Distance Matrix).
const geocodeCache = new Map<string, { lat: number; lon: number } | null>();

async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  const key = address.trim().toLowerCase();
  if (!key) return null;
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

// Geen routing-API (bv. Google Maps Distance Matrix) beschikbaar zonder betaalde API-key,
// dus hemelsbrede afstand x een correctiefactor voor bochten/omwegen als benadering.
const ROAD_DISTANCE_CORRECTION_FACTOR = 1.3;
const EARTH_RADIUS_KM = 6371;

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export async function estimateOneWayDistanceKm(
  fromAddress: string,
  toAddress: string
): Promise<number | null> {
  if (!fromAddress.trim() || !toAddress.trim()) return null;

  const [from, to] = await Promise.all([geocodeAddress(fromAddress), geocodeAddress(toAddress)]);
  if (!from || !to) return null;

  return Math.round(haversineKm(from, to) * ROAD_DISTANCE_CORRECTION_FACTOR * 10) / 10;
}
