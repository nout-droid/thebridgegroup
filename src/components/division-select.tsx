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
}: {
  id: string;
  defaultValue?: string;
  triggerClassName?: string;
}) {
  return (
    <Select name="division" defaultValue={defaultValue || DIVISIONS[0]}>
      <SelectTrigger id={id} className={cn("h-8 w-36 text-xs", triggerClassName)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {DIVISIONS.map((d) => (
          <SelectItem key={d} value={d}>
            {d}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
