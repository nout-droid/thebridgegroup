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

export type InvoiceStatus = "draft" | "sent" | "paid";

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Concept",
  sent: "Verstuurd",
  paid: "Betaald",
};

export type ShowType = "dag" | "nacht" | "beide";

export const GUEST_TYPES = ["gast", "vip", "pers", "sponsor", "overig"] as const;
export type GuestType = (typeof GUEST_TYPES)[number];

export const GUEST_TYPE_LABELS: Record<GuestType, string> = {
  gast: "Gast",
  vip: "VIP",
  pers: "Pers",
  sponsor: "Sponsor",
  overig: "Overig",
};

export const GUEST_RSVP_STATUSES = ["uitgenodigd", "bevestigd", "afgemeld"] as const;
export type GuestRsvpStatus = (typeof GUEST_RSVP_STATUSES)[number];

export const GUEST_RSVP_STATUS_LABELS: Record<GuestRsvpStatus, string> = {
  uitgenodigd: "Uitgenodigd",
  bevestigd: "Bevestigd",
  afgemeld: "Afgemeld",
};

export interface EventGuest {
  id: string;
  project_id: string;
  name: string;
  email: string;
  phone: string;
  guest_type: GuestType | string;
  rsvp_status: GuestRsvpStatus | string;
  plus_ones: number;
  notes: string;
  badge_token: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
  sort_order: number;
  created_at: string;
}

export interface EventAttendee {
  id: string;
  project_id: string;
  name: string;
  email: string | null;
  company: string | null;
  title: string | null;
  bio: string | null;
  photo_url: string | null;
  networking_opt_in: boolean;
  access_code: string;
  created_at: string;
}

export interface AttendeeSavedContact {
  id: string;
  attendee_id: string;
  saved_attendee_id: string;
  created_at: string;
}

// Publiek profiel zoals de directory/opgeslagen-contacten-RPC's het teruggeven aan andere
// attendees — bewust zonder e-mail en zonder access_code (zie get_attendee_directory).
export interface AttendeePublicProfile {
  id: string;
  name: string;
  company: string | null;
  title: string | null;
  bio: string | null;
  photo_url: string | null;
}

export interface AttendeeSavedProfile extends AttendeePublicProfile {
  saved_at: string;
}

export interface AttendeeAgendaItem {
  id: string;
  stage_name: string | null;
  activity_date: string;
  activity_time: string;
  activity: string;
}

// Wat get_attendee_home(p_attendee_id) teruggeeft: eigen volledige profiel (inclusief
// e-mail — alleen voor zichzelf zichtbaar), projectkerngegevens en het publieke draaiboek.
export interface AttendeeHome {
  attendee: {
    id: string;
    name: string;
    email: string | null;
    company: string | null;
    title: string | null;
    bio: string | null;
    photo_url: string | null;
    networking_opt_in: boolean;
  };
  project: {
    id: string;
    name: string;
    event_date: string | null;
  };
  agenda: AttendeeAgendaItem[];
  parking_passes: SharedParkingPass[];
}

export interface Organization {
  id: string;
  owner_user_id: string;
  name: string;
  logo_url: string | null;
  brand_color: string | null;
  iban: string | null;
  plan: string;
  subscription_status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  trial_ends_at: string | null;
  created_at: string;
}

export type BudgetAccess = "closed" | "open";

export interface ClientAccount {
  id: string;
  owner_user_id: string;
  name: string;
  email: string;
  budget_access: BudgetAccess;
  can_edit_checklist: boolean;
  can_submit_requests: boolean;
  created_at: string;
}

export interface ClientAccountProject {
  id: string;
  name: string;
  client_name: string;
  event_date: string | null;
  status: string;
  share_token: string;
}

export type SalesLeadStage = "lead" | "contacted" | "proposal" | "quote_sent" | "won" | "lost";

export interface SalesLead {
  id: string;
  user_id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  website: string;
  source: string;
  stage: SalesLeadStage;
  estimated_value: number;
  probability_percentage: number;
  expected_close_date: string | null;
  notes: string;
  project_id: string | null;
  created_at: string;
  updated_at: string;
  activities?: SalesLeadActivity[];
}

export type SalesLeadActivityType = "call" | "email" | "meeting" | "note";

export interface SalesLeadActivity {
  id: string;
  lead_id: string;
  activity_type: SalesLeadActivityType;
  description: string;
  created_by: string | null;
  created_at: string;
}

export type TenderStage = "geidentificeerd" | "go_no_go" | "ingediend" | "gewonnen" | "verloren";

export interface Tender {
  id: string;
  user_id: string;
  title: string;
  client_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  stage: TenderStage;
  estimated_value: number;
  submission_deadline: string | null;
  decision_date: string | null;
  notes: string;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenderActivity {
  id: string;
  tender_id: string;
  activity_type: SalesLeadActivityType;
  description: string;
  created_by: string | null;
  created_at: string;
}

export interface Freelancer {
  id: string;
  user_id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  home_address: string;
  day_rate: number;
  overtime_rate: number;
  km_rate: number;
  skills: string[];
  notes: string;
  created_at: string;
  availability?: FreelancerAvailability[];
}

export type FreelancerAvailabilityStatus = "available" | "unavailable";

export interface FreelancerAvailability {
  id: string;
  freelancer_id: string;
  start_date: string;
  end_date: string;
  status: FreelancerAvailabilityStatus;
  note: string;
  created_at: string;
}

// Eigen materiaal (dat wij zelf meenemen) — losstaand van de leveranciers-catalogus, die
// gaat over GEHUURDE spullen. Zie supabase/migrations_equipment_inventory.sql.
export interface EquipmentItem {
  id: string;
  user_id: string;
  name: string;
  category: string;
  asset_number: string;
  quantity_owned: number;
  internal_day_rate: number;
  replacement_value: number;
  notes: string;
  created_at: string;
}

export interface EquipmentBooking {
  id: string;
  equipment_item_id: string;
  project_id: string;
  stage_id: string | null;
  quantity: number;
  access_dates: string[];
  notes: string;
  created_at: string;
}

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
  venue_id: string | null;
  invoice_number: string | null;
  invoice_status: InvoiceStatus;
  invoice_date: string | null;
  quote_number: string | null;
  quote_date: string | null;
  quote_notes: string | null;
  client_reference: string | null;
  attendee_app_enabled: boolean;
  weather_alert_sent_at: string | null;
  ai_client_update_draft: string | null;
  ai_client_update_generated_at: string | null;
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
  // Alleen aanwezig waar expliciet berekend (zie budget/page.tsx) — niet iedere
  // supplier-query heeft dit nodig, dus geen kolom maar een optioneel client-side veld.
  avg_rating?: number | null;
  rating_count?: number;
}

export interface VenueDocument {
  id: string;
  venue_id: string;
  title: string;
  storage_path: string;
  original_filename: string;
  created_at: string;
}

export interface Venue {
  id: string;
  user_id: string;
  name: string;
  address: string | null;
  capacity: number | null;
  power_availability: string | null;
  load_in_access: string | null;
  dimensions: string | null;
  rigging_notes: string | null;
  wifi_notes: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
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

export const CLIENT_REQUEST_CATEGORIES = [
  "catering",
  "materieel",
  "comms",
  "stroom",
  "hotel",
  "vlucht",
  "overig",
] as const;
export type ClientRequestCategory = (typeof CLIENT_REQUEST_CATEGORIES)[number];

export interface ClientRequest {
  id: string;
  category: ClientRequestCategory | string;
  description: string;
  quantity: number;
  requested_date: string | null;
  notes: string;
  status: "new" | "acknowledged" | "done";
  created_at: string;
}

export interface SharedCatering {
  id: string;
  order_date: string;
  party: string;
  crew_lunch: number;
  veggie_lunch: number;
  crew_dinner: number;
  veggie_dinner: number;
  night_snacks: number;
  notes: string;
  supplier_name: string | null;
}

export interface SharedEquipment {
  id: string;
  machine_type: string;
  quantity: number;
  accessories: string;
  reservation_date: string | null;
  duration: string;
  supplier_name: string | null;
}

export interface SharedComms {
  id: string;
  kind: string;
  user_name: string;
  device_type: string;
  channels: string;
  supplier_name: string | null;
}

export interface SharedPower {
  id: string;
  stage_name: string | null;
  description: string;
  quantity: number;
  position: string;
  notes: string;
  supplier_name: string | null;
}

export interface SharedScheduleItem {
  id: string;
  stage_name: string | null;
  activity_date: string;
  activity_time: string;
  activity: string;
  notes: string;
  suppliers: string[];
}

export interface SharedArtistRider {
  id: string;
  artist_name: string;
  rider_received: boolean;
  notes: string;
  own_light_operator: boolean;
  own_audio_operator: boolean;
  rider_link: string;
}

export interface SharedOpenQuestion {
  id: string;
  question: string;
  answer: string;
  pending: boolean;
}

export interface SharedMeetingNote {
  id: string;
  note: string;
  created_at: string;
}

export interface SharedFlight {
  id: string;
  name: string;
  role: string;
  flight_departure_airport: string;
  flight_destination: string;
  flight_departure_at: string | null;
  flight_return_at: string | null;
}

export interface SharedHotelGuest {
  id: string;
  name: string;
  role: string;
}

export interface SharedProduction {
  catering: SharedCatering[];
  equipment: SharedEquipment[];
  comms: SharedComms[];
  power: SharedPower[];
  schedule: SharedScheduleItem[];
  artist_riders: SharedArtistRider[];
  open_questions: SharedOpenQuestion[];
  meeting_notes: SharedMeetingNote[];
  flights: SharedFlight[];
  hotel: SharedHotelGuest[];
  client_requests: ClientRequest[];
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

export interface AuditLogEntry {
  id: string;
  owner_user_id: string;
  actor_label: string;
  action: string;
  details: string;
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
  uploaded_by: "owner" | "guest";
  created_at: string;
}

// Projectbrede parkeerpas (PDF/afbeelding), zichtbaar voor crew/gasten/aanwezigen onafhankelijk
// van elkaar (visible_to_*-vlaggen) — geen toewijzing per persoon. storage_path is een
// bucket-relatief pad in de privé "portal-documents"-bucket, zelfde patroon als
// ProjectDocument/GuestDocument hierboven.
export interface ParkingPass {
  id: string;
  project_id: string;
  title: string;
  storage_path: string;
  visible_to_crew: boolean;
  visible_to_guests: boolean;
  visible_to_attendees: boolean;
  created_at: string;
}

export interface IncidentReport {
  id: string;
  project_id: string;
  stage_id: string | null;
  division: string;
  description: string;
  photo_path: string | null;
  reported_by: string;
  created_at: string;
}

export interface LostFoundItem {
  id: string;
  project_id: string;
  description: string;
  photo_path: string | null;
  status: "lost" | "found" | "claimed";
  created_at: string;
}

export interface SupplierRating {
  id: string;
  project_id: string;
  supplier_id: string;
  rating: number;
  note: string;
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
  checked_in_at: string | null;
  checked_out_at: string | null;
  skills: string[];
  day_rate: number;
  overtime_rate: number;
  overtime_hours: number;
  home_address: string;
  km_rate: number;
  distance_km: number | null;
  freelancer_id: string | null;
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

export interface CrewRating {
  id: string;
  project_id: string;
  crew_member_id: string;
  freelancer_id: string | null;
  role: string;
  rating: number;
  note: string;
  created_at: string;
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
  stage_id: string | null;
  sort_order: number;
  created_at: string;
  supplier?: Supplier;
  stage?: Stage;
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
  amps: number | null;
  phase: 1 | 3;
  sort_order: number;
  created_at: string;
  supplier?: Supplier;
  stage?: Stage;
}

// 230V voor 1-fase, 400V lijnspanning voor 3-fase (standaard EU-netspanning) — genoeg voor
// een indicatieve belasting per aanvraag/area, geen vervanging voor een echte elektrotechnische
// berekening door de leverancier.
export function computePowerLoadKw(amps: number | null, phase: 1 | 3, quantity: number): number {
  if (!amps) return 0;
  const voltage = phase === 3 ? 400 * Math.sqrt(3) : 230;
  return (voltage * amps * quantity) / 1000;
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

export interface Speaker {
  id: string;
  project_id: string;
  stage_id: string | null;
  name: string;
  title: string;
  company: string;
  bio: string;
  presentation_url: string;
  presentation_filename: string;
  notes_for_showcaller: string;
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

export interface SharedSpeaker {
  id: string;
  stage_id: string | null;
  name: string;
  title: string;
  company: string;
  bio: string;
  presentation_filename: string;
  has_presentation: boolean;
  notes_for_showcaller: string;
}

// Minimale weergave van een parkeerpas voor de portalen (crew/attendee via RPC, geen
// storage_path — dat lekt niet mee naar anon, downloaden gaat via een token-geverifieerde
// download-route die pas op dat moment tekent).
export interface SharedParkingPass {
  id: string;
  title: string;
}

export interface SharedRundowns {
  project: { name: string; event_date: string | null };
  scopes: SharedRundownScope[];
  notes: CrewNote[];
  chat: RundownChatMessage[];
  speakers: SharedSpeaker[];
  parking_passes: SharedParkingPass[];
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
  load_in_time: string | null;
  load_out_time: string | null;
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

// Werkelijk gefactureerde kosten door een leverancier, los van de begrote kosten
// (categories.manual_cost / gekozen quote.cost_price) — zie budget-pagina voor de
// begroot-vs-werkelijk vergelijking. category_id is nullable: niet elke werkelijke kost
// hoort bij een categorie (bv. algemene/overheadkosten). document_url bevat het
// bucket-relatieve pad in de "portal-documents" storage bucket (niet een publieke URL —
// die bucket is privé, downloads lopen via een signed URL, zelfde patroon als
// project_documents.storage_path).
export interface ActualCost {
  id: string;
  project_id: string;
  category_id: string | null;
  supplier_id: string | null;
  description: string;
  amount: number;
  invoice_number: string | null;
  invoice_date: string | null;
  document_url: string | null;
  created_at: string;
  supplier?: Supplier;
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
  margin_type: MarginType | null;
  margin_value: number | null;
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
    organization_name: string;
    budget_access: BudgetAccess;
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
  role_id: string | null;
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

// Uitbreidbaar rechtenprofiel per organisatie — bepaalt of een teamlid alle projecten of
// alleen toegewezen projecten ziet, wel/geen begroting, wel/geen bewerkrechten, en welke
// navigatie-onderdelen zichtbaar zijn. Zie ensure-team-roles.ts voor de 5 standaardrollen.
export interface TeamRoleDef {
  id: string;
  owner_user_id: string;
  name: string;
  all_projects: boolean;
  can_view_budget: boolean;
  can_edit: boolean;
  nav_sections: string[];
  sort_order: number;
  created_at: string;
}

export const NAV_SECTION_OPTIONS: { value: string; label: string }[] = [
  { value: "projects", label: "Projecten" },
  { value: "calendar", label: "Kalender" },
  { value: "analytics", label: "Analytics" },
  { value: "crm", label: "Sales" },
  { value: "tenders", label: "Tenders" },
  { value: "suppliers", label: "Leveranciers" },
  { value: "freelancers", label: "Freelancers" },
  { value: "equipment", label: "Materiaal" },
  { value: "venues", label: "Locaties" },
  { value: "clients", label: "Klanten" },
  { value: "team", label: "Team" },
];

export interface TodoTemplateItem {
  id: string;
  owner_user_id: string;
  title: string;
  sort_order: number;
  created_at: string;
}

export interface ProjectTodo {
  id: string;
  project_id: string;
  title: string;
  done: boolean;
  done_at: string | null;
  sort_order: number;
  created_at: string;
}
