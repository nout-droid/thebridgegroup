// Downloadknop voor een taalgevoelige PDF-export (factuur, offerte, en op termijn de overige
// document-exports): het hoofdblok gebruikt de huidige apptaal-toggle (server-side via
// getAppLang() in de route), de kleine NL/EN-links ernaast forceren expliciet een taal via
// ?lang=nl|en — zo kan een NL-browsende producer alsnog een Engelse versie naar een
// internationale klant sturen zonder de hele app om te zetten. Puur server-renderbare links,
// geen interactiviteit nodig, dus geen "use client".
export function PdfDownloadLink({
  href,
  label,
  nlTitle,
  enTitle,
}: {
  href: string;
  label: string;
  nlTitle: string;
  enTitle: string;
}) {
  return (
    <div className="flex shrink-0 items-stretch overflow-hidden rounded-md">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        {label}
      </a>
      <div className="flex items-center divide-x divide-primary-foreground/20 border-l border-primary-foreground/20 bg-primary/80 text-[11px] font-semibold text-primary-foreground">
        <a href={`${href}?lang=nl`} target="_blank" rel="noopener noreferrer" className="px-2 py-2 hover:bg-primary" title={nlTitle}>
          NL
        </a>
        <a href={`${href}?lang=en`} target="_blank" rel="noopener noreferrer" className="px-2 py-2 hover:bg-primary" title={enTitle}>
          EN
        </a>
      </div>
    </div>
  );
}
