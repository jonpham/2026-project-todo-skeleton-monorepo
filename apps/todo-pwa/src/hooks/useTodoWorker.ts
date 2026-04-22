import { useEffect, useRef, useState } from "react";
import type { TodoItem } from "../workers/todo.worker";

export type { TodoItem };

const STORAGE_KEY = "todos";

function loadFromStorage(): TodoItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function useTodoWorker() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/todo.worker.ts", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = (event: MessageEvent<{ todos: TodoItem[] }>) => {
      const updated = event.data.todos;
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
    workerRef.current?.postMessage({
      type: "CREATE_TODO",
      payload: { description },
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

  return { todos, createTodo, updateTodo, toggleTodo, deleteTodo };
}
