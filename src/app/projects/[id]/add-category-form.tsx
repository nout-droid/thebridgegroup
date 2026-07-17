import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createCategory } from "./actions";

export function AddCategoryForm({
  projectId,
  stageId = null,
}: {
  projectId: string;
  stageId?: string | null;
}) {
  return (
    <form
      action={createCategory.bind(null, projectId, stageId)}
      className="flex items-end gap-2"
    >
      <div className="flex-1 space-y-1.5">
        <Input name="name" placeholder="Nieuwe categorie, bv. Audio" required />
      </div>
      <Button type="submit">Categorie toevoegen</Button>
    </form>
  );
}
