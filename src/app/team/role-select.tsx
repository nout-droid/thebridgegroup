import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TEAM_ROLE_LABELS, type TeamRole } from "@/lib/types";

const ROLES: TeamRole[] = ["member", "admin"];

export function TeamRoleSelect({
  id,
  name = "role",
  defaultValue = "member",
}: {
  id: string;
  name?: string;
  defaultValue?: TeamRole;
}) {
  const items = ROLES.map((role) => ({ value: role, label: TEAM_ROLE_LABELS[role] }));

  return (
    <Select name={name} defaultValue={defaultValue} items={items}>
      <SelectTrigger id={id} className="h-8 w-full min-w-0 text-xs">
        <SelectValue className="min-w-0 truncate" />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((role) => (
          <SelectItem key={role} value={role}>
            {TEAM_ROLE_LABELS[role]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
