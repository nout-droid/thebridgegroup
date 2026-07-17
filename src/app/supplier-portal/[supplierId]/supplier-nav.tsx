import Image from "next/image";

export function Nav({ supplierName }: { supplierName: string }) {
  return (
    <header className="flex items-center gap-2 bg-black px-6 py-3 text-sm font-semibold uppercase tracking-wide text-primary">
      <Image src="/logo.png" alt="The Bridge AV Group" width={28} height={21} />
      The Bridge AV Group
      <span className="ml-auto text-white/70 normal-case tracking-normal">{supplierName}</span>
    </header>
  );
}
