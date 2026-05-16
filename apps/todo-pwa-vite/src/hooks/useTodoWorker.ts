import { useEffect, useRef, useState } from "react";
import type { TodoHook, UiTodo } from "../types/todo";

const STORAGE_KEY = "todos";

function loadFromStorage(): UiTodo[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function useTodoWorker(): TodoHook {
  const [todos, setTodos] = useState<UiTodo[]>([]);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/todo.worker.ts", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = (event: MessageEvent<{ todos: UiTodo[] }>) => {
      const updated = event.data.todos.map((t) => ({
        ...t,
        syncStatus: "synced" as const,
      }));
      setTodos(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    };

    workerRef.current = worker;
    worker.postMessage({
      type: "LOAD_TODOS",
      payload: { todos: loadFromStorage() },
    });

    return () => {
      worker.terminate();
    };
  }, []);

  function createTodo(description: string) {
    const id = crypto.randomUUID();
    workerRef.current?.postMessage({
      type: "CREATE_TODO",
      payload: { id, description },
    });
  }

  function updateTodo(id: string, description: string) {
    workerRef.current?.postMessage({
      type: "UPDATE_TODO",
      payload: { id, description },
    });
  }

  function toggleTodo(id: string) {
    workerRef.current?.postMessage({ type: "TOGGLE_TODO", payload: { id } });
  }

  function deleteTodo(id: string) {
    workerRef.current?.postMessage({ type: "DELETE_TODO", payload: { id } });
  }

  return {
    todos,
    createTodo,
    updateTodo,
    toggleTodo,
    deleteTodo,
    offline: false,
    error: null,
    isLoading: false,
  };
}
