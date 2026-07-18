import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Supplier } from "@/lib/types";

export function SupplierSelect({
  id,
  name = "supplier_id",
  defaultValue,
  suppliers,
}: {
  id: string;
  name?: string;
  defaultValue?: string;
  suppliers: Supplier[];
}) {
  const items = suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }));

  return (
    <Select name={name} defaultValue={defaultValue} items={items}>
      <SelectTrigger id={id} className="h-8 w-full min-w-0 text-xs">
        <SelectValue className="min-w-0 truncate" placeholder="Kies leverancier" />
      </SelectTrigger>
      <SelectContent>
        {suppliers.map((supplier) => (
          <SelectItem key={supplier.id} value={supplier.id}>
            {supplier.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
