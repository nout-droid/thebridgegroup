import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TEAM_ROLE_LABELS, type TeamRole } from "@/lib/types";
import type { Translator } from "@/lib/server/translate";

const ROLES: TeamRole[] = ["member", "admin"];

const identity: Translator = (text) => text;

export function TeamRoleSelect({
  id,
  name = "role",
  defaultValue = "member",
  t = identity,
}: {
  id: string;
  name?: string;
  defaultValue?: TeamRole;
  t?: Translator;
}) {
  const items = ROLES.map((role) => ({ value: role, label: t(TEAM_ROLE_LABELS[role]) }));

  return (
    <Select name={name} defaultValue={defaultValue} items={items}>
      <SelectTrigger id={id} className="h-8 w-full min-w-0 text-xs">
        <SelectValue className="min-w-0 truncate" />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((role) => (
          <SelectItem key={role} value={role}>
            {t(TEAM_ROLE_LABELS[role])}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
