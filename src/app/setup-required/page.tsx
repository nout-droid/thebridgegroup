import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SetupRequiredPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Supabase nog niet aangesloten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Deze app heeft een eigen Supabase-project nodig. Volg deze stappen om verder te
            gaan:
          </p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Maak een gratis project aan op{" "}
              <span className="font-medium text-foreground">supabase.com</span>.
            </li>
            <li>
              Open in het Supabase dashboard <span className="font-medium text-foreground">SQL Editor</span>{" "}
              en voer het script <code className="rounded bg-muted px-1 py-0.5">supabase/schema.sql</code>{" "}
              uit dit project uit.
            </li>
            <li>
              Kopieer in <span className="font-medium text-foreground">Project Settings → API</span> de
              Project URL en de anon public key.
            </li>
            <li>
              Maak een bestand <code className="rounded bg-muted px-1 py-0.5">.env.local</code> in de
              projectmap op basis van <code className="rounded bg-muted px-1 py-0.5">.env.local.example</code>{" "}
              en vul beide waarden in.
            </li>
            <li>Herstart <code className="rounded bg-muted px-1 py-0.5">npm run dev</code>.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
