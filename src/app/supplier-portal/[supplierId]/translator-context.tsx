"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useTranslator, type Lang, type Translator } from "@/hooks/use-translator";

const SupplierTranslatorContext = createContext<{ lang: Lang; setLang: (lang: Lang) => void; t: Translator } | null>(
  null
);

export function useSupplierTranslator() {
  const ctx = useContext(SupplierTranslatorContext);
  if (!ctx) {
    throw new Error("useSupplierTranslator must be used within SupplierTranslatorProvider");
  }
  return ctx;
}

export function SupplierTranslatorProvider({
  staticLabels,
  dynamicTexts,
  children,
}: {
  staticLabels: readonly string[];
  dynamicTexts: string[];
  children: ReactNode;
}) {
  const { lang, setLang, t } = useTranslator(staticLabels, dynamicTexts);
  return (
    <SupplierTranslatorContext.Provider value={{ lang, setLang, t }}>{children}</SupplierTranslatorContext.Provider>
  );
}
