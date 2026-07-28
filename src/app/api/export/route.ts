import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamOwnerId } from "@/lib/server/team";

// Gegevensexport voor de organisatie-eigenaar (GDPR-inzage/dataportabiliteit). Gebruikt
// PostgREST's embedded-select om alles onder een project in één keer op te halen — de
// project_id-scoping op het topniveau (projects.user_id) zorgt dat alle geneste rijen
// automatisch tot deze organisatie beperkt blijven, zonder dat we elke tussentabel
// (categories -> quotes -> quote_line_items, riders -> rider_sections -> ..., etc.)
// los hoeven te bevragen.
const PROJECT_NESTED_SELECT = `
  *,
  categories(*, quotes(*, quote_line_items(*))),
  material_list_items(*),
  stages(*),
  riders(*, rider_sections(*, rider_section_items(*))),
  schedule_items(*),
  crew_members(*),
  equipment_reservations(*),
  comms_assignments(*),
  catering_orders(*),
  artist_riders(*),
  open_questions(*),
  meeting_notes(*),
  power_requests(*),
  rundowns(*, rundown_items(*, rundown_item_instructions(*))),
  crew_notes(*),
  project_media(*),
  quote_documents(*),
  guest_documents(*)
`;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const ownerId = await getTeamOwnerId(supabase, user.id);
  if (ownerId !== user.id) {
    return NextResponse.json(
      { error: "Alleen de organisatie-eigenaar kan een volledige export opvragen." },
      { status: 403 }
    );
  }

  const admin = createAdminClient();

  const [projects, suppliers, organization, clientAccounts, teamMembers] = await Promise.all([
    admin.from("projects").select(PROJECT_NESTED_SELECT).eq("user_id", ownerId),
    admin.from("suppliers").select("*").eq("user_id", ownerId),
    admin.from("organizations").select("*").eq("owner_user_id", ownerId).maybeSingle(),
    admin.from("client_accounts").select("*, client_account_projects(*)").eq("owner_user_id", ownerId),
    admin.from("team_members").select("*").eq("owner_user_id", ownerId),
  ]);

  const { data: authUser } = await admin.auth.admin.getUserById(ownerId);

  const dump = {
    generated_at: new Date().toISOString(),
    account: { id: authUser?.user?.id, email: authUser?.user?.email },
    organization: organization.data,
    team_members: teamMembers.data,
    suppliers: suppliers.data,
    client_accounts: clientAccounts.data,
    projects: projects.data,
  };

  return new NextResponse(JSON.stringify(dump, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="export-${ownerId}-${Date.now()}.json"`,
    },
  });
}
