import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Publiek, no-login voorbeeldproject voor marketingdoeleinden (screenshots op /pricing).
// Haalt data op via dezelfde get_shared_* RPC's als de klantportal-shareview — die zijn
// bewust "grant ... to anon" (capability-token, zelfde vertrouwensmodel als een deelbare
// link), dus dit vraagt geen enkele login/wachtwoord aan en muteert niets.
const DEMO_SHARE_TOKEN = "98f515f3-2689-43ad-a424-5ff9121563fa";

function euro(value: number | null) {
  if (value === null || value === undefined) return "—";
  return `€ ${Number(value).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface SharedCategory {
  id: string;
  name: string;
  status: string;
  cost_price: number | null;
  supplier_name: string | null;
  client_price: number | null;
}

interface SharedProject {
  project: { name: string; client_name: string; event_date: string; status: string };
  project_wide_categories: SharedCategory[];
  stages: { id: string; name: string; categories: SharedCategory[] }[];
}

interface SharedProduction {
  catering: { order_date: string; party: string; crew_lunch: number; veggie_lunch: number; supplier_name: string | null }[];
  equipment: { machine_type: string; quantity: number; reservation_date: string; supplier_name: string | null }[];
  comms: { user_name: string; device_type: string; channels: string | null }[];
  power: { stage_name: string | null; description: string; quantity: number; supplier_name: string | null }[];
  flights: { name: string; role: string | null; flight_destination: string | null; flight_departure_at: string | null }[];
  hotel: { name: string; role: string | null }[];
}

interface SharedRundownItem {
  id: string;
  cue_number: string | null;
  name: string;
  duration_seconds: number | null;
  color: string | null;
  instructions: { division: string; instruction: string }[];
}

interface SharedRundowns {
  project: { name: string };
  scopes: { stage_name: string | null; rundowns: { show_date: string; items: SharedRundownItem[] }[] }[];
}

async function getDemoData() {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [projectRes, productionRes, rundownsRes] = await Promise.all([
    supabase.rpc("get_shared_project", { p_token: DEMO_SHARE_TOKEN }),
    supabase.rpc("get_shared_production", { p_token: DEMO_SHARE_TOKEN }),
    supabase.rpc("get_shared_rundowns", { p_token: DEMO_SHARE_TOKEN }),
  ]);

  return {
    project: projectRes.data as SharedProject | null,
    production: productionRes.data as SharedProduction | null,
    rundowns: rundownsRes.data as SharedRundowns | null,
  };
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default async function DemoPage() {
  const { project, production, rundowns } = await getDemoData();

  const categories = [
    ...(project?.stages ?? []).flatMap((s) => s.categories),
    ...(project?.project_wide_categories ?? []),
  ];
  const totalCost = categories.reduce((sum, c) => sum + (c.cost_price ?? 0), 0);
  const totalClient = categories.reduce((sum, c) => sum + (c.client_price ?? 0), 0);

  const richestRundown = (rundowns?.scopes ?? [])
    .flatMap((s) => (s.rundowns ?? []).map((r) => ({ scope: s, rundown: r })))
    .sort((a, b) => (b.rundown.items?.length ?? 0) - (a.rundown.items?.length ?? 0))[0];
  const firstScope = richestRundown?.scope;
  const firstRundown = richestRundown?.rundown;

  return (
    <div className="min-h-screen bg-white text-foreground">
      <header className="border-b border-black bg-black text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2 font-heading text-base font-extrabold uppercase tracking-tight">
            <img src="/logo.png" alt="The Bridge Group B.V." width={24} height={18} />
            The Bridge — Productie
          </div>
          <Badge variant="secondary" className="uppercase tracking-wide">
            Demo project
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-16 px-6 py-10">
        {/* Overview */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Project</p>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight">{project?.project?.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Client: {project?.project?.client_name} &middot; {project?.project?.event_date}
          </p>
        </section>

        {/* Budget & Suppliers */}
        <section id="section-budget">
          <h2 className="mb-4 font-heading text-xl font-extrabold uppercase tracking-tight">Budget & Categories</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {categories.slice(0, 6).map((cat) => (
              <Card key={cat.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">{cat.name}</CardTitle>
                  <Badge variant={cat.status === "gekozen" ? "default" : "outline"}>{cat.status}</Badge>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p className="text-muted-foreground">{cat.supplier_name ?? "No supplier chosen yet"}</p>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-muted-foreground">Cost price</span>
                    <span className="font-semibold">{euro(cat.cost_price)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Client price</span>
                    <span className="font-semibold">{euro(cat.client_price)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-4 flex gap-8 rounded-lg border bg-muted/30 p-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total cost</p>
              <p className="text-lg font-bold">{euro(totalCost)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total client price</p>
              <p className="text-lg font-bold">{euro(totalClient)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Margin</p>
              <p className="text-lg font-bold">{euro(totalClient - totalCost)}</p>
            </div>
          </div>
        </section>

        {/* Production */}
        <section id="section-production">
          <h2 className="mb-4 font-heading text-xl font-extrabold uppercase tracking-tight">
            Full Production Planning
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                  Equipment & Machinery
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(production?.equipment ?? []).slice(0, 4).map((e, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span>{e.machine_type}</span>
                    <span className="text-muted-foreground">×{e.quantity}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Catering</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(production?.catering ?? []).slice(0, 4).map((c, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span>{c.order_date} — {c.party}</span>
                    <span className="text-muted-foreground">
                      {c.crew_lunch + c.veggie_lunch} lunch
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                  Comms & Radios
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(production?.comms ?? []).slice(0, 4).map((c, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span>{c.user_name}</span>
                    <span className="text-muted-foreground">{c.device_type}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Power</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(production?.power ?? []).slice(0, 4).map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span>{p.description}</span>
                    <span className="text-muted-foreground">{p.stage_name ?? "—"}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                  Hotel & Flights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(production?.flights ?? []).slice(0, 3).map((f, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span>{f.name}</span>
                    <span className="text-muted-foreground">{f.flight_destination ?? "Flight"}</span>
                  </div>
                ))}
                {(production?.hotel ?? []).slice(0, 2).map((h, i) => (
                  <div key={`h-${i}`} className="flex items-center justify-between">
                    <span>{h.name}</span>
                    <span className="text-muted-foreground">Hotel</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Rundown */}
        <section id="section-rundown">
          <h2 className="mb-4 font-heading text-xl font-extrabold uppercase tracking-tight">
            Live Show Rundown
          </h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {firstScope?.stage_name ?? "Main Stage"} — {firstRundown?.show_date}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(firstRundown?.items ?? []).slice(0, 5).map((item) => (
                <div key={item.id} className="border-b py-2 text-sm last:border-0">
                  <div className="flex items-start gap-3">
                    <span className="w-10 shrink-0 font-mono text-muted-foreground">{item.cue_number}</span>
                    <span
                      className="mt-1 h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color || "#9ca3af" }}
                    />
                    <span className="flex-1 font-medium">{item.name}</span>
                    <span className="text-muted-foreground">{formatDuration(item.duration_seconds)}</span>
                  </div>
                  {item.instructions.length > 0 && (
                    <div className="ml-16 mt-1.5 space-y-1">
                      {item.instructions.map((instr, i) => (
                        <p key={i} className="text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">{instr.division}:</span> {instr.instruction}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* Portals */}
        <section id="section-portals">
          <h2 className="mb-4 font-heading text-xl font-extrabold uppercase tracking-tight">
            A Portal for Every Stakeholder
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {["Client", "Supplier", "Crew", "Showcaller", "Guest"].map((role) => (
              <Card key={role}>
                <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                    {role[0]}
                  </div>
                  <p className="text-sm font-semibold">{role} portal</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
