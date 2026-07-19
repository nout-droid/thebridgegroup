import { isSupabaseConfigured } from "@/lib/env";
import { ClockView } from "./clock-view";

export default async function ClockPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ stage?: string; date?: string }>;
}) {
  const { token } = await params;
  const { stage, date } = await searchParams;

  if (!isSupabaseConfigured) {
    return <p className="p-6 text-sm text-muted-foreground">Deze pagina is nog niet beschikbaar.</p>;
  }

  return <ClockView token={token} stageId={stage ?? null} date={date ?? null} />;
}
