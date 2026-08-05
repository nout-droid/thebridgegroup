import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RiderSection } from "@/lib/types";

const identity = (text: string) => text;

export const RIDER_READONLY_LABELS = ["Rider", "Klant vult in", "Bijlagen"];

// t is optioneel (default: geen vertaling) — interne, Nederlandstalige weergaven (bv.
// eigenaar-kant stagepagina's) geven 'm gewoon niet mee; het leveranciersportaal wel.
export function RiderReadOnly({
  sections,
  label = "Rider",
  labelSuffix,
  t = identity,
}: {
  sections: RiderSection[];
  label?: string;
  labelSuffix?: string;
  t?: (text: string) => string;
}) {
  if (!sections.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {t(label)}
          {labelSuffix ? ` — ${t(labelSuffix)}` : ""}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sections.map((section) => (
          <div key={section.id} className="space-y-1 rounded-md border p-3">
            <div className="flex items-center gap-2">
              <p className="font-medium">{t(section.title)}</p>
              {section.editable_by_client && <Badge variant="secondary">{t("Klant vult in")}</Badge>}
            </div>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {section.content ? t(section.content) : "—"}
            </p>
            {(section.items ?? []).length > 0 && (
              <ul className="list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
                {(section.items ?? []).map((item) => (
                  <li key={item.id}>{t(item.description)}</li>
                ))}
              </ul>
            )}
            {(section.attachments ?? []).length > 0 && (
              <div className="space-y-0.5 border-t pt-2">
                <p className="text-xs font-medium text-muted-foreground">{t("Bijlagen")}</p>
                <ul className="space-y-0.5">
                  {(section.attachments ?? []).map((attachment) =>
                    attachment.url ? (
                      <li key={attachment.id}>
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary underline"
                        >
                          {attachment.original_filename}
                        </a>
                      </li>
                    ) : (
                      <li key={attachment.id} className="text-sm text-muted-foreground">
                        {attachment.original_filename}
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
