"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useTranslator } from "@/hooks/use-translator";
import { LanguageToggle } from "@/components/language-toggle";

interface GuestDocumentWithUrl {
  id: string;
  title: string;
  url: string | null;
}

const STATIC_LABELS = [
  "Er zijn nog geen documenten geplaatst.",
  "Downloaden",
  "Jouw documenten",
  "Upload hier accreditatiedocumenten (bv. ID-bewijs, verzekering) vóór het event.",
  "Nog geen documenten geüpload.",
  "Titel",
  "bv. ID-bewijs",
  "Uploaden",
  "Bezig met uploaden...",
  "Geüpload.",
];

export function GuestView({
  projectName,
  eventDate,
  documents,
  uploadedDocuments,
  organizationName,
  uploadAction,
}: {
  projectName: string;
  eventDate: string | null;
  documents: GuestDocumentWithUrl[];
  uploadedDocuments: GuestDocumentWithUrl[];
  organizationName: string;
  uploadAction: (formData: FormData) => Promise<void>;
}) {
  const dynamicTexts = [
    projectName,
    ...documents.map((d) => d.title),
    ...uploadedDocuments.map((d) => d.title),
  ];
  const { lang, setLang, t } = useTranslator(STATIC_LABELS, dynamicTexts);
  const [isPending, startTransition] = useTransition();
  const [uploaded, setUploaded] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await uploadAction(formData);
      formRef.current?.reset();
      setUploaded(true);
    });
  }

  return (
    <div>
      <header className="flex items-center justify-between gap-2 bg-black px-6 py-3 text-primary">
        <div className="flex items-center gap-2 font-heading text-base font-extrabold tracking-tight">
          <Image src="/logo.png" alt={organizationName} width={28} height={21} />
          {organizationName}
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

        <div className="space-y-3 border-t pt-6">
          <div>
            <h2 className="font-heading text-lg font-bold uppercase tracking-tight">
              {t("Jouw documenten")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("Upload hier accreditatiedocumenten (bv. ID-bewijs, verzekering) vóór het event.")}
            </p>
          </div>

          {uploadedDocuments.length > 0 && (
            <ul className="space-y-2">
              {uploadedDocuments.map((doc) => (
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

          <form ref={formRef} action={handleSubmit} className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <label htmlFor="guest-doc-title" className="text-sm">
                {t("Titel")}
              </label>
              <input
                id="guest-doc-title"
                name="title"
                placeholder={t("bv. ID-bewijs")}
                required
                onChange={() => setUploaded(false)}
                className="h-9 w-48 rounded-md border border-input bg-transparent px-2 text-sm"
              />
            </div>
            <input
              type="file"
              name="file"
              required
              onChange={() => setUploaded(false)}
              className="max-w-xs text-sm"
            />
            <button
              type="submit"
              disabled={isPending}
              className="h-9 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {isPending ? t("Bezig met uploaden...") : t("Uploaden")}
            </button>
            {uploaded && !isPending && (
              <span className="text-sm text-primary">{t("Geüpload.")}</span>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
