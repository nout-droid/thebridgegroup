export function computeRentalDays(project: {
  build_start_date: string | null;
  strike_end_date: string | null;
}): number {
  if (!project.build_start_date || !project.strike_end_date) return 4;

  const start = new Date(`${project.build_start_date}T00:00:00`).getTime();
  const end = new Date(`${project.strike_end_date}T00:00:00`).getTime();
  const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;

  return Math.max(1, days);
}
