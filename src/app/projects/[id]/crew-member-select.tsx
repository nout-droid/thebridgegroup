import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CrewMember } from "@/lib/types";

export function CrewMemberSelect({
  id,
  name = "crew_member_id",
  defaultValue,
  members,
  placeholder = "Geen koppeling",
}: {
  id: string;
  name?: string;
  defaultValue?: string;
  members: CrewMember[];
  placeholder?: string;
}) {
  const items = members.map((member) => ({ value: member.id, label: member.name }));

  return (
    <Select name={name} defaultValue={defaultValue} items={items}>
      <SelectTrigger id={id} className="h-8 w-full min-w-0 text-xs">
        <SelectValue className="min-w-0 truncate" placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {members.map((member) => (
          <SelectItem key={member.id} value={member.id}>
            {member.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
