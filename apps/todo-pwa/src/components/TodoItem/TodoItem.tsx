import { useState } from "react";
import type { TodoItem as TodoItemType } from "../../types/todo";

interface TodoItemProps {
  todo: TodoItemType;
  onToggle: (id: string) => void;
  onUpdate: (id: string, description: string) => void;
  onDelete: (id: string) => void;
}

export function TodoItem({
  todo,
  onToggle,
  onUpdate,
  onDelete,
}: TodoItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.description);

  function commitEdit() {
    const trimmed = draft.trim();
    if (trimmed) onUpdate(todo.id, trimmed);
    setEditing(false);
  }

  function cancelEdit() {
    setDraft(todo.description);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") cancelEdit();
  }

  return (
    <li className="flex items-center gap-3 rounded border bg-white px-4 py-2">
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
        className="h-4 w-4 accent-indigo-500"
      />

      {editing ? (
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitEdit}
          autoFocus
          className="flex-1 rounded border border-indigo-300 px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          className={`flex-1 cursor-pointer text-sm text-gray-800 ${todo.completed ? "line-through text-gray-400" : ""}`}
        >
          {todo.description}
        </span>
      )}

      <button
        onClick={() => onDelete(todo.id)}
        aria-label="Delete"
        className="text-gray-400 hover:text-red-500"
      >
        ✕
      </button>
    </li>
  );
}
