import { useEffect, useRef, useState } from "react";
import type { TodoHook, UiTodo } from "../types/todo";

type WorkerCommand =
  | { type: "INIT" }
  | { type: "CREATE_TODO"; payload: { description: string } }
  | { type: "UPDATE_TODO"; payload: { id: string; description: string } }
  | { type: "TOGGLE_TODO"; payload: { id: string } }
  | { type: "DELETE_TODO"; payload: { id: string } };

type WorkerState = {
  todos: UiTodo[];
  offline: boolean;
  error: string | null;
  isLoading?: boolean;
};

export function useTodoWorker(): TodoHook {
  const [todos, setTodos] = useState<UiTodo[]>([]);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/todo.worker.ts", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = (event: MessageEvent<WorkerState>) => {
      setTodos(event.data.todos);
      setOffline(event.data.offline);
      setError(event.data.error);
      if (event.data.isLoading !== undefined) {
        setIsLoading(event.data.isLoading);
      }
    };

    workerRef.current = worker;
    worker.postMessage({ type: "INIT" } satisfies WorkerCommand);

    return () => {
      worker.terminate();
    };
  }, []);

  function post(command: WorkerCommand) {
    workerRef.current?.postMessage(command);
  }

  return {
    todos,
    createTodo: (description) =>
      post({ type: "CREATE_TODO", payload: { description } }),
    updateTodo: (id, description) =>
      post({ type: "UPDATE_TODO", payload: { id, description } }),
    toggleTodo: (id) => post({ type: "TOGGLE_TODO", payload: { id } }),
    deleteTodo: (id) => post({ type: "DELETE_TODO", payload: { id } }),
    offline,
    error,
    isLoading,
  };
}
