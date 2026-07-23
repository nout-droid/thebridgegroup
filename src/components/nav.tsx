import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { computeCo2Total } from "@/lib/co2";

export async function Nav() {
  const supabase = await createClient();

  const [flightResult, kmResult, quoteResult] = await Promise.all([
    supabase.from("crew_members").select("id", { count: "exact", head: true }).eq("needs_flight", true),
    supabase.from("categories").select("estimated_km"),
    supabase.from("quotes").select("co2_kg"),
  ]);

  const totalKm = (kmResult.data ?? []).reduce((sum, row) => sum + (row.estimated_km ?? 0), 0);
  const totalQuoteKg = (quoteResult.data ?? []).reduce((sum, row) => sum + (row.co2_kg ?? 0), 0);
  const co2 = computeCo2Total(flightResult.count ?? 0, totalKm, totalQuoteKg);

  return (
    <header className="border-b border-black bg-black text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <nav className="flex items-center gap-6 text-sm uppercase tracking-wide">
          <Link
            href="/projects"
            className="flex items-center gap-2 font-heading text-base font-extrabold tracking-tight text-primary normal-case"
          >
            <Image src="/logo.png" alt="The Bridge AV Group" width={28} height={21} />
            The Bridge — Productie
          </Link>
          <Link href="/projects" className="text-white/70 transition-colors hover:text-white">
            Projecten
          </Link>
          <Link href="/suppliers" className="text-white/70 transition-colors hover:text-white">
            Leveranciers
          </Link>
          <Link href="/team" className="text-white/70 transition-colors hover:text-white">
            Team
          </Link>
          <Link href="/co2" className="flex items-center gap-2 text-white/70 transition-colors hover:text-white">
            CO2
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[11px] normal-case tracking-normal text-primary">
              🌱 {Math.round(co2.totalKg).toLocaleString("nl-NL")} kg
            </span>
          </Link>
        </nav>
        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-white/70 hover:bg-white/10 hover:text-white"
          >
            Uitloggen
          </Button>
        </form>
      </div>
    </header>
  );
}
