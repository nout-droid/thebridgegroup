import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DIVISIONS } from "@/lib/divisions";

export function DivisionSelect({
  id,
  defaultValue,
}: {
  id: string;
  defaultValue?: string;
}) {
  return (
    <Select name="division" defaultValue={defaultValue || DIVISIONS[0]}>
      <SelectTrigger id={id} className="h-8 w-36 text-xs">
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
