import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ProjectTodo } from "@/lib/types";
import { addProjectTodo, deleteProjectTodo, saveProjectTodosAsDefaultTemplate, toggleProjectTodo } from "./todo-actions";

export interface TodoCardLabels {
  title: string;
  addPlaceholder: string;
  add: string;
  empty: string;
  completed: string;
  delete: string;
  saveAsDefault: string;
}

export function TodoCard({
  projectId,
  todos,
  labels,
}: {
  projectId: string;
  todos: ProjectTodo[];
  labels: TodoCardLabels;
}) {
  const open = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{labels.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {open.length === 0 && done.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.empty}</p>
        ) : (
          <ul className="space-y-1">
            {open.map((todo) => (
              <li key={todo.id} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-sm">
                <form action={toggleProjectTodo.bind(null, projectId, todo.id)} className="min-w-0 flex-1">
                  <button type="submit" className="flex w-full items-center gap-2 text-left">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-input" />
                    <span className="truncate">{todo.title}</span>
                  </button>
                </form>
                <form action={deleteProjectTodo.bind(null, projectId, todo.id)}>
                  <Button type="submit" size="sm" variant="ghost" className="h-6 shrink-0 px-1.5 text-[10px] text-destructive">
                    {labels.delete}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form action={addProjectTodo.bind(null, projectId)} className="flex items-end gap-1.5">
          <Input name="title" placeholder={labels.addPlaceholder} className="h-8 flex-1 text-xs" required />
          <Button type="submit" size="sm" className="h-8 text-xs">
            {labels.add}
          </Button>
        </form>

        {done.length > 0 && (
          <details className="rounded-md border p-2">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
              {labels.completed} ({done.length})
            </summary>
            <ul className="mt-2 space-y-1">
              {done.map((todo) => (
                <li key={todo.id} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-xs">
                  <form action={toggleProjectTodo.bind(null, projectId, todo.id)} className="min-w-0 flex-1">
                    <button type="submit" className="flex w-full items-center gap-2 text-left text-muted-foreground">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-input bg-primary/20 text-primary">
                        ✓
                      </span>
                      <span className="truncate line-through">{todo.title}</span>
                    </button>
                  </form>
                  <form action={deleteProjectTodo.bind(null, projectId, todo.id)}>
                    <Button type="submit" size="sm" variant="ghost" className="h-6 shrink-0 px-1.5 text-[10px] text-destructive">
                      {labels.delete}
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </details>
        )}

        {todos.length > 0 && (
          <form action={saveProjectTodosAsDefaultTemplate.bind(null, projectId)}>
            <Button type="submit" size="sm" variant="outline" className="h-7 text-xs">
              {labels.saveAsDefault}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
