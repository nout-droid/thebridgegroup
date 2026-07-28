"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSupplierTranslator } from "./translator-context";

const TABS = [
  { key: "rider", label: "Event rider" },
  { key: "offertes", label: "Offertes" },
  { key: "begroting", label: "Begroting" },
  { key: "aanvragen", label: "Aanvragen" },
] as const;

export type SupplierTabKey = (typeof TABS)[number]["key"];

function tabHref(supplierId: string, key: SupplierTabKey) {
  const base = `/supplier-portal/${supplierId}`;
  return key === "rider" ? base : `${base}/${key}`;
}

export function Nav({
  supplierId,
  supplierName,
  active,
}: {
  supplierId: string;
  supplierName: string;
  active: SupplierTabKey;
}) {
  const { t } = useSupplierTranslator();

  return (
    <header className="bg-black text-sm font-semibold uppercase tracking-wide text-primary">
      <div className="flex items-center gap-2 px-6 py-3">
        <Image src="/logo.png" alt="The Bridge Group B.V." width={28} height={21} />
        The Bridge Group B.V.
        <span className="ml-auto text-white/70 normal-case tracking-normal">{supplierName}</span>
      </div>
      <nav className="flex gap-1 border-t border-white/10 px-6 py-2 normal-case tracking-normal">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tabHref(supplierId, tab.key)}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active === tab.key ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
            )}
          >
            {t(tab.label)}
          </Link>
        ))}
      </nav>
    </header>
  );
}
