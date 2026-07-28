import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createCategory } from "./actions";
import type { Translator } from "@/lib/server/translate";

export const ADD_CATEGORY_FORM_LABELS = ["Nieuwe categorie, bv. Audio", "Categorie toevoegen"];

export function AddCategoryForm({
  projectId,
  stageId = null,
  t,
}: {
  projectId: string;
  stageId?: string | null;
  t: Translator;
}) {
  return (
    <form
      action={createCategory.bind(null, projectId, stageId)}
      className="flex items-end gap-2"
    >
      <div className="flex-1 space-y-1.5">
        <Input name="name" placeholder={t("Nieuwe categorie, bv. Audio")} required />
      </div>
      <Button type="submit">{t("Categorie toevoegen")}</Button>
    </form>
  );
}
