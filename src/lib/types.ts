export type MarginType = "percentage" | "fixed";

export type CategoryStatus =
  | "concept"
  | "aanvraag_verstuurd"
  | "offertes_binnen"
  | "leverancier_gekozen"
  | "bevestigd";

export type QuoteStatus = "aangevraagd" | "ontvangen" | "gekozen";

export const CATEGORY_STATUS_LABELS: Record<CategoryStatus, string> = {
  concept: "Concept",
  aanvraag_verstuurd: "Aanvraag verstuurd",
  offertes_binnen: "Offertes binnen",
  leverancier_gekozen: "Leverancier gekozen",
  bevestigd: "Bevestigd",
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  aangevraagd: "Aangevraagd",
  ontvangen: "Ontvangen",
  gekozen: "Gekozen",
};

export type ShowType = "dag" | "nacht" | "beide";

export interface Project {
  id: string;
  user_id: string;
  name: string;
  client_name: string;
  event_date: string | null;
  status: string;
  share_token: string;
  build_start_date: string | null;
  strike_end_date: string | null;
  show_start_date: string | null;
  show_end_date: string | null;
  show_type: ShowType;
  suppliers_manage_travel: boolean;
  background_image_url: string | null;
  event_code: string;
  client_password_hash: string | null;
  guest_password_hash: string | null;
  crew_password_hash: string | null;
  showcaller_password_hash: string | null;
  budget_approval_status: "pending" | "approved" | "changes_requested" | "rejected";
  budget_approval_comment: string | null;
  budget_approval_at: string | null;
  client_budget: number | null;
  default_margin_percentage: number;
  created_at: string;
}

export type ProjectMediaKind = "photo" | "video_link";

export interface ProjectMedia {
  id: string;
  project_id: string;
  kind: ProjectMediaKind;
  url: string;
  caption: string;
  sort_order: number;
  created_at: string;
}

export interface Supplier {
  id: string;
  user_id: string;
  name: string;
  contact_email: string;
  contact_phone: string;
  specialties: string;
  default_discount_percentage: number;
  portal_code: string | null;
  portal_password_hash: string | null;
  created_at: string;
}

export interface Rider {
  id: string;
  project_id: string;
  version: number;
  updated_at: string;
  created_at: string;
}

export interface RiderSection {
  id: string;
  rider_id: string;
  stage_id: string | null;
  title: string;
  content: string;
  editable_by_client: boolean;
  include_in_callsheet: boolean;
  sort_order: number;
  updated_by: "owner" | "client";
  updated_at: string;
  created_at: string;
  items?: RiderSectionItem[];
}

export interface RiderSectionItem {
  id: string;
  section_id: string;
  description: string;
  sort_order: number;
  created_at: string;
}

export interface SharedRiderSection {
  id: string;
  title: string;
  content: string;
  editable_by_client: boolean;
  stage_id: string | null;
  stage_name: string | null;
  items: { id: string; description: string }[];
}

export interface SharedRider {
  version: number;
  updated_at: string;
  sections: SharedRiderSection[];
}

export interface IntakeChecklistAnswer {
  section_key: string;
  content: string;
  updated_by: "owner" | "client";
}

export interface IntakeChecklistPhoto {
  id: string;
  section_key: string;
  original_filename: string;
  uploaded_by: "owner" | "client";
  created_at: string;
}

export interface SharedIntakeChecklist {
  updated_at: string | null;
  answers: IntakeChecklistAnswer[];
  photos: IntakeChecklistPhoto[];
}

export interface SharedCo2 {
  flight_count: number;
  total_km: number;
  quote_kg: number;
}

export interface ActivityLogEntry {
  id: string;
  project_id: string;
  actor_type: "client" | "supplier";
  actor_label: string;
  category: string;
  description: string;
  acknowledged_at: string | null;
  notified_at: string | null;
  created_at: string;
}

export interface ProjectDocument {
  id: string;
  project_id: string;
  title: string;
  storage_path: string;
  original_filename: string;
  created_at: string;
}

export interface QuoteDocument {
  id: string;
  quote_id: string | null;
  uploaded_by: "owner" | "supplier";
  storage_path: string;
  original_filename: string;
  confirmed_at: string | null;
  created_at: string;
  project_id: string | null;
  supplier_id: string | null;
}

export interface GuestDocument {
  id: string;
  project_id: string;
  title: string;
  storage_path: string;
  original_filename: string;
  created_at: string;
}

export interface Stage {
  id: string;
  project_id: string;
  name: string;
  sort_order: number;
  showcaller_password_hash: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  project_id: string;
  stage_id: string | null;
  name: string;
  sort_order: number;
  status: CategoryStatus;
  margin_type: MarginType;
  margin_value: number;
  manual_cost: number | null;
  estimated_km: number | null;
  created_at: string;
}

export interface ScheduleItem {
  id: string;
  project_id: string;
  stage_id: string | null;
  activity_date: string;
  activity_time: string;
  activity: string;
  priority: string;
  notes: string;
  sort_order: number;
  created_at: string;
  suppliers?: ScheduleItemSupplier[];
}

export interface ScheduleItemSupplier {
  id: string;
  schedule_item_id: string;
  supplier_id: string;
  sort_order: number;
  created_at: string;
  supplier?: Supplier;
}

export interface CrewMember {
  id: string;
  project_id: string;
  name: string;
  supplier_id: string | null;
  role: string;
  access_level: string;
  id_number: string;
  accredited: boolean;
  access_dates: string[];
  sort_order: number;
  created_at: string;
  crew_position_id: string | null;
  artist_rider_id: string | null;
  needs_catering: boolean;
  needs_hotel: boolean;
  badge_token: string;
  needs_flight: boolean;
  passport_number: string;
  flight_departure_airport: string;
  flight_destination: string;
  flight_departure_at: string | null;
  flight_return_at: string | null;
  flight_booking_number: string;
  flight_ticket_number: string;
  per_diem_rate: number;
  supplier?: Supplier;
}

export type CrewProvidedBy = "wij" | "klant" | "leverancier";

export interface CrewPosition {
  id: string;
  project_id: string;
  work_date: string;
  role: string;
  quantity: number;
  provided_by: CrewProvidedBy;
  supplier_id: string | null;
  stage_id: string | null;
  needs_accreditation: boolean;
  needs_catering: boolean;
  needs_hotel: boolean;
  needs_flight: boolean;
  notes: string;
  sort_order: number;
  created_at: string;
  supplier?: Supplier;
  stage?: Stage;
}

export interface EquipmentReservation {
  id: string;
  project_id: string;
  stage_id: string | null;
  machine_type: string;
  supplier_id: string | null;
  quantity: number;
  accessories: string;
  reservation_date: string | null;
  duration: string;
  machine_number: string;
  picked_up: boolean;
  key_holder: string;
  sort_order: number;
  created_at: string;
  supplier?: Supplier;
}

export type CommsKind = "intercom" | "portofoon";

export interface CommsAssignment {
  id: string;
  project_id: string;
  stage_id: string | null;
  kind: CommsKind;
  user_name: string;
  device_type: string;
  channels: string;
  supplier_id: string | null;
  crew_member_id: string | null;
  sort_order: number;
  created_at: string;
  supplier?: Supplier;
  crew_member?: CrewMember;
}

export interface CateringOrder {
  id: string;
  project_id: string;
  order_date: string;
  party: string;
  crew_lunch: number;
  veggie_lunch: number;
  crew_dinner: number;
  veggie_dinner: number;
  night_snacks: number;
  notes: string;
  supplier_id: string | null;
  sort_order: number;
  created_at: string;
  supplier?: Supplier;
}

export interface PowerRequest {
  id: string;
  project_id: string;
  stage_id: string | null;
  supplier_id: string | null;
  description: string;
  quantity: number;
  position: string;
  notes: string;
  sort_order: number;
  created_at: string;
  supplier?: Supplier;
  stage?: Stage;
}

export interface ArtistRider {
  id: string;
  project_id: string;
  artist_name: string;
  rider_received: boolean;
  notes: string;
  own_light_operator: boolean;
  own_audio_operator: boolean;
  rider_link: string;
  sort_order: number;
  created_at: string;
}

export interface OpenQuestion {
  id: string;
  project_id: string;
  question: string;
  answer: string;
  pending: boolean;
  sort_order: number;
  created_at: string;
}

export interface MeetingNote {
  id: string;
  project_id: string;
  note: string;
  sort_order: number;
  created_at: string;
}

export interface Rundown {
  id: string;
  project_id: string;
  stage_id: string | null;
  show_date: string;
  start_time: string;
  is_live: boolean;
  current_item_id: string | null;
  current_item_started_at: string | null;
  actual_start_at: string | null;
  created_at: string;
}

export interface RundownItemInstruction {
  id: string;
  item_id: string;
  division: string;
  instruction: string;
  sort_order: number;
  created_at: string;
}

export interface RundownItem {
  id: string;
  rundown_id: string;
  cue_number: string;
  name: string;
  duration_seconds: number;
  notes: string;
  color: string;
  sort_order: number;
  created_at: string;
  instructions?: RundownItemInstruction[];
}

export interface CrewNote {
  id: string;
  stage_id: string | null;
  division: string;
  note: string;
  created_at: string;
}

export interface SharedRundownDate {
  id: string;
  show_date: string;
  start_time: string;
  is_live: boolean;
  current_item_id: string | null;
  current_item_started_at: string | null;
  actual_start_at: string | null;
  items: {
    id: string;
    cue_number: string;
    name: string;
    duration_seconds: number;
    notes: string;
    color: string;
    sort_order: number;
    instructions: { id: string; division: string; instruction: string }[];
  }[];
}

export interface SharedRundownScope {
  stage_id: string | null;
  stage_name: string | null;
  rundowns: SharedRundownDate[];
}

export interface RundownChatMessage {
  id: string;
  stage_id: string | null;
  sender: string;
  message: string;
  created_at: string;
}

export interface SharedRundowns {
  project: { name: string; event_date: string | null };
  scopes: SharedRundownScope[];
  notes: CrewNote[];
  chat: RundownChatMessage[];
}

export function computeClientPrice(category: Category, costPrice: number) {
  return category.margin_type === "percentage"
    ? Math.round(costPrice * (1 + category.margin_value / 100) * 100) / 100
    : costPrice + category.margin_value;
}

export interface Quote {
  id: string;
  category_id: string;
  supplier_id: string;
  cost_price: number;
  notes: string;
  status: QuoteStatus;
  received_at: string | null;
  co2_kg: number | null;
  created_at: string;
  supplier?: Supplier;
  line_items?: QuoteLineItem[];
}

export interface QuoteLineItem {
  id: string;
  quote_id: string;
  material_list_item_id: string | null;
  catalog_article_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  created_at: string;
}

export interface SharedLineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface SharedCategory {
  id: string;
  name: string;
  sort_order: number;
  status: CategoryStatus;
  margin_type: MarginType;
  margin_value: number;
  cost_price: number | null;
  supplier_name: string | null;
  client_price: number | null;
  line_items: SharedLineItem[];
}

export interface SharedStage {
  id: string;
  name: string;
  categories: SharedCategory[];
}

export interface SharedMedia {
  kind: ProjectMediaKind;
  url: string;
  caption: string;
}

export interface SharedProject {
  project: {
    name: string;
    client_name: string;
    event_date: string | null;
    status: string;
    background_image_url: string | null;
    budget_approval_status: "pending" | "approved" | "changes_requested" | "rejected";
    budget_approval_comment: string | null;
  };
  project_wide_categories: SharedCategory[];
  stages: SharedStage[];
  media: SharedMedia[];
}

export interface CatalogArticle {
  id: string;
  supplier_id: string;
  external_code: string;
  name: string;
  brand: string | null;
  category: string;
  properties: string;
  day_price: number;
  last_seen_price: number | null;
  last_seen_price_at: string | null;
  unit: string;
  created_at: string;
}

export interface MaterialListItem {
  id: string;
  project_id: string;
  stage_id: string | null;
  raw_description: string;
  quantity: number;
  unit: string;
  matched_article_id: string | null;
  unit_price: number | null;
  created_at: string;
  matched_article?: CatalogArticle & { supplier?: Supplier };
}

export interface CatalogMatchSuggestion {
  article_id: string;
  supplier_id: string;
  supplier_name: string;
  name: string;
  category: string;
  day_price: number;
  last_seen_price: number | null;
  last_seen_price_at: string | null;
  similarity: number;
}

export const CATALOG_CATEGORY_LABELS: Record<string, string> = {
  LIGHT: "Licht",
  SOUND: "Geluid",
  VIDEO: "Video",
  RIGGING: "Rigging",
  CABLES: "Kabels",
  SALES: "Overig",
};

export function catalogCategoryLabel(category: string): string {
  return CATALOG_CATEGORY_LABELS[category.toUpperCase()] ?? (category || "Overig");
}

export type TeamRole = "admin" | "member";

export interface TeamMember {
  id: string;
  owner_user_id: string;
  member_user_id: string;
  role: TeamRole;
  invited_email: string;
  can_view_budget: boolean;
  created_at: string;
}

export interface TeamMemberProjectAccess {
  id: string;
  team_member_id: string;
  project_id: string;
  created_at: string;
}

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  admin: "Beheerder",
  member: "Lid",
};
