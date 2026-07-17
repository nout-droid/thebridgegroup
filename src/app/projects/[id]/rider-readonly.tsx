import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RiderSection } from "@/lib/types";

export function RiderReadOnly({ sections }: { sections: RiderSection[] }) {
  if (!sections.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Rider</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sections.map((section) => (
          <div key={section.id} className="space-y-1 rounded-md border p-3">
            <div className="flex items-center gap-2">
              <p className="font-medium">{section.title}</p>
              {section.editable_by_client && <Badge variant="secondary">Klant vult in</Badge>}
            </div>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {section.content || "—"}
            </p>
            {(section.items ?? []).length > 0 && (
              <ul className="list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
                {(section.items ?? []).map((item) => (
                  <li key={item.id}>{item.description}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
