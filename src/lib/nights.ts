export function computeNights(dates: string[]): number {
  if (dates.length < 2) return 1;
  const sorted = [...dates].sort();
  const start = new Date(`${sorted[0]}T00:00:00`).getTime();
  const end = new Date(`${sorted[sorted.length - 1]}T00:00:00`).getTime();
  return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
}
