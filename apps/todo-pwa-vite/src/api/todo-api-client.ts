import type { TodoItem } from "../types/todo";

const base = () => import.meta.env.VITE_TODO_API_URL as string;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = init
    ? await fetch(`${base()}${path}`, init)
    : await fetch(`${base()}${path}`);
  if (!res.ok) throw new Error(`${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function fetchTodos(): Promise<TodoItem[]> {
  return request<TodoItem[]>("/todos");
}

export function createTodo(id: string, description: string): Promise<TodoItem> {
  return request<TodoItem>("/todos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, description }),
  });
}

export function updateTodo(id: string, description: string): Promise<TodoItem> {
  return request<TodoItem>(`/todos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description }),
  });
}

export function toggleTodo(id: string, completed: boolean): Promise<TodoItem> {
  return request<TodoItem>(`/todos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed }),
  });
}

export function deleteTodo(id: string): Promise<void> {
  return request<void>(`/todos/${id}`, { method: "DELETE" });
}
