// Klantrechten per onderdeel van het klantenportaal. "none" = klant ziet het onderdeel niet,
// "view" = klant mag alleen meekijken, "edit" = klant mag meebewerken (samenwerking). Secties
// die al hun eigen bewerk-mechanisme hebben (rider: rider_sections.editable_by_client,
// storybook: approval-flow, checklist: altijd al invulbaar) zitten hier bewust niet in — dit
// systeem is voor de nieuwe productie-secties en de nieuwe read-only tabs.
export type ClientPermissionLevel = "none" | "view" | "edit";

export type ClientPermissionSection =
  | "catering"
  | "guest_catering"
  | "equipment"
  | "comms"
  | "power"
  | "schedule"
  | "artist_riders"
  | "questions"
  | "travel"
  | "speakers"
  | "guests"
  | "contingency";

export type ClientPermissions = Partial<Record<ClientPermissionSection, ClientPermissionLevel>>;

export const DEFAULT_CLIENT_PERMISSIONS: Record<ClientPermissionSection, ClientPermissionLevel> = {
  catering: "view",
  guest_catering: "view",
  equipment: "view",
  comms: "view",
  power: "view",
  schedule: "view",
  artist_riders: "view",
  questions: "view",
  travel: "view",
  speakers: "view",
  guests: "view",
  contingency: "view",
};

// Secties waarvoor "edit" ook daadwerkelijk een bewerk-UI en een client-write-action heeft.
// Secties die hier niet in staan tonen in de instellingen-UI alleen een aan/uit-schakelaar
// (none/view), geen "samen bewerken"-optie — want die zou niets doen.
export const CLIENT_EDITABLE_SECTIONS: readonly ClientPermissionSection[] = [
  "equipment",
  "comms",
  "power",
  "schedule",
  "catering",
  "artist_riders",
  "questions",
];

export const CLIENT_PERMISSION_SECTION_LABELS: Record<ClientPermissionSection, string> = {
  catering: "Catering crew",
  guest_catering: "Catering gasten",
  equipment: "Materieel",
  comms: "Comms & portofoons",
  power: "Stroom",
  schedule: "Draaiboek",
  artist_riders: "Artiestenriders",
  questions: "Open vragen & notulen",
  travel: "Vluchten & hotel",
  speakers: "Sprekers",
  guests: "Gastenlijst",
  contingency: "Weer-plan B",
};

export function getClientPermission(
  permissions: ClientPermissions | null | undefined,
  section: ClientPermissionSection
): ClientPermissionLevel {
  return permissions?.[section] ?? DEFAULT_CLIENT_PERMISSIONS[section];
}

export function canClientView(permissions: ClientPermissions | null | undefined, section: ClientPermissionSection): boolean {
  return getClientPermission(permissions, section) !== "none";
}

export function canClientEdit(permissions: ClientPermissions | null | undefined, section: ClientPermissionSection): boolean {
  return getClientPermission(permissions, section) === "edit";
}
