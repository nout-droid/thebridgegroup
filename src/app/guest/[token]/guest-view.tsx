"use client";

import Image from "next/image";
import { useTranslator } from "@/hooks/use-translator";
import { LanguageToggle } from "@/components/language-toggle";

interface GuestDocumentWithUrl {
  id: string;
  title: string;
  url: string | null;
}

const STATIC_LABELS = ["Er zijn nog geen documenten geplaatst.", "Downloaden"];

export function GuestView({
  projectName,
  eventDate,
  documents,
}: {
  projectName: string;
  eventDate: string | null;
  documents: GuestDocumentWithUrl[];
}) {
  const dynamicTexts = [projectName, ...documents.map((d) => d.title)];
  const { lang, setLang, t } = useTranslator(STATIC_LABELS, dynamicTexts);

  return (
    <div>
      <header className="flex items-center justify-between gap-2 bg-black px-6 py-3 text-primary">
        <div className="flex items-center gap-2 font-heading text-base font-extrabold tracking-tight">
          <Image src="/logo.png" alt="The Bridge AV Group" width={28} height={21} />
          The Bridge AV Group
        </div>
        <LanguageToggle lang={lang} onChange={setLang} variant="dark" />
      </header>
      <div className="mx-auto w-full max-w-2xl space-y-6 px-6 py-8">
        <div>
          <h1 className="font-heading text-3xl font-extrabold uppercase tracking-tight">
            {t(projectName)}
          </h1>
          {eventDate && <p className="text-muted-foreground">{eventDate}</p>}
        </div>

        {!documents.length ? (
          <p className="text-sm text-muted-foreground">{t("Er zijn nog geen documenten geplaatst.")}</p>
        ) : (
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between rounded-md border p-3">
                <span>{t(doc.title)}</span>
                {doc.url && (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline"
                  >
                    {t("Downloaden")}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
