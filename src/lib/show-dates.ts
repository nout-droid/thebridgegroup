function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

// Alle showdagen van een project, als reeks tussen show_start_date en show_end_date
// (inclusief) — valt terug op event_date of vandaag als er nog geen periode is ingevuld.
export function computeShowDates(project: {
  show_start_date: string | null;
  show_end_date: string | null;
  event_date: string | null;
}): string[] {
  const start = project.show_start_date ?? project.event_date;
  if (!start) return [isoToday()];

  const end = project.show_end_date ?? start;
  const dates: string[] = [];
  // Expliciet UTC ("Z") parsen en met UTC-dagen itereren, anders schuift de datum een dag
  // op zodra de servertijdzone vóór UTC ligt (bv. Europe/Amsterdam) door de latere
  // toISOString()-conversie.
  const cursor = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  while (cursor.getTime() <= endDate.getTime()) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates.length ? dates : [start];
}

// Kiest een verstandige default showdag: vandaag als die in de reeks zit, anders de
// eerstvolgende toekomstige dag, anders de laatste (meest recente) dag.
export function pickDefaultShowDate(dates: string[]): string {
  const today = isoToday();
  if (dates.includes(today)) return today;
  const future = dates.find((d) => d >= today);
  return future ?? dates[dates.length - 1] ?? today;
}
