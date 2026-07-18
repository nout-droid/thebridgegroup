import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Stage } from "@/lib/types";

export function StageSelect({
  id,
  name = "stage_id",
  defaultValue,
  stages,
}: {
  id: string;
  name?: string;
  defaultValue?: string;
  stages: Stage[];
}) {
  const items = stages.map((stage) => ({ value: stage.id, label: stage.name }));

  return (
    <Select name={name} defaultValue={defaultValue} items={items}>
      <SelectTrigger id={id} className="h-8 w-full min-w-0 text-xs">
        <SelectValue className="min-w-0 truncate" placeholder="Kies podium" />
      </SelectTrigger>
      <SelectContent>
        {stages.map((stage) => (
          <SelectItem key={stage.id} value={stage.id}>
            {stage.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
