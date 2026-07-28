import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DIVISIONS } from "@/lib/divisions";

export function DivisionSelect({
  id,
  defaultValue,
  triggerClassName,
  labels,
}: {
  id: string;
  defaultValue?: string;
  triggerClassName?: string;
  labels?: Partial<Record<(typeof DIVISIONS)[number], string>>;
}) {
  const labelFor = (d: string) => labels?.[d as (typeof DIVISIONS)[number]] ?? d;

  return (
    <Select
      name="division"
      defaultValue={defaultValue || DIVISIONS[0]}
      items={DIVISIONS.map((d) => ({ value: d, label: labelFor(d) }))}
    >
      <SelectTrigger id={id} className={cn("h-8 w-36 text-xs", triggerClassName)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {DIVISIONS.map((d) => (
          <SelectItem key={d} value={d}>
            {labelFor(d)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
