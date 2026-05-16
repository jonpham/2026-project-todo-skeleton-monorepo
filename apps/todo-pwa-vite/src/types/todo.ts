export type { TodoItem } from "@jonpham/2026-project-todo-types";

export type SyncStatus = "pending" | "synced" | "failed";

export type UiTodo = import("@jonpham/2026-project-todo-types").TodoItem & {
  syncStatus: SyncStatus;
};

export interface TodoHook {
  todos: UiTodo[];
  createTodo: (description: string) => void;
  updateTodo: (id: string, description: string) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  offline: boolean;
  error: string | null;
  isLoading: boolean;
}
