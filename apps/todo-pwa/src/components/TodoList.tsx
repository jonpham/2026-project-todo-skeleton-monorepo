import type { TodoItem } from "../workers/todo.worker";
import { TodoItem as TodoItemComponent } from "./TodoItem";

interface TodoListProps {
  todos: TodoItem[];
  onToggle: (id: string) => void;
  onUpdate: (id: string, description: string) => void;
  onDelete: (id: string) => void;
}

export function TodoList({
  todos,
  onToggle,
  onUpdate,
  onDelete,
}: TodoListProps) {
  if (todos.length === 0) {
    return (
      <p className="mt-8 text-center text-sm text-gray-400">
        No to-do items yet. Add one above!
      </p>
    );
  }

  return (
    <ul className="mt-4 space-y-2">
      {todos.map((todo) => (
        <TodoItemComponent
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
