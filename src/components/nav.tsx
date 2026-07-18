import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

export function Nav() {
  return (
    <header className="border-b border-black bg-black text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <nav className="flex items-center gap-6 text-sm uppercase tracking-wide">
          <Link href="/projects" className="flex items-center gap-2 font-semibold text-primary">
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
