import { useEffect, useRef, useState } from "react";
import type { TodoItem } from "../workers/todo.worker";

export type { TodoItem };

export function useTodoWorker() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/todo.worker.ts", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = (event: MessageEvent<{ todos: TodoItem[] }>) => {
      setTodos(event.data.todos);
    };

    workerRef.current = worker;
    worker.postMessage({ type: "GET_ALL_TODOS" });

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
