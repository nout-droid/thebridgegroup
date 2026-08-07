// Slecht-weer-drempel: minimaal 60% kans op neerslag, of een WMO-weathercode voor
// (onweers)buien of hevige neerslag — zie https://open-meteo.com/en/docs voor de codes.
// Gedeeld tussen de weeralert-cron (server) en de WeatherStrip (client), zodat "slecht weer"
// overal dezelfde definitie heeft.
const BAD_WEATHER_CODES = new Set([65, 66, 67, 75, 82, 86, 95, 96, 99]);

export function isBadWeather(forecast: { precipitationProbability: number; weatherCode: number }): boolean {
  return forecast.precipitationProbability >= 60 || BAD_WEATHER_CODES.has(forecast.weatherCode);
}
