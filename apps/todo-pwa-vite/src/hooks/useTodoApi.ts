import { useEffect, useRef, useState } from "react";
import * as api from "../api/todo-api-client";
import type { TodoHook, UiTodo } from "../types/todo";

const TODOS_KEY = "todos";
const QUEUE_KEY = "todo-sync-queue";

type QueueItem =
  | { type: "CREATE_TODO"; payload: { id: string; description: string } }
  | { type: "UPDATE_TODO"; payload: { id: string; description: string } }
  | { type: "TOGGLE_TODO"; payload: { id: string; completed: boolean } }
  | { type: "DELETE_TODO"; payload: { id: string } };

function loadTodos(): UiTodo[] {
  try {
    return JSON.parse(localStorage.getItem(TODOS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function loadQueue(): QueueItem[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveQueue(q: QueueItem[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

function is409(err: unknown): boolean {
  if (err instanceof Error) return err.message === "409";
  return (err as { status?: number })?.status === 409;
}

export function useTodoApi(): TodoHook {
  const [todos, setTodos] = useState<UiTodo[]>([]);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const todosRef = useRef<UiTodo[]>([]);
  const offlineRef = useRef(!navigator.onLine);
  const flushingRef = useRef(false);

  function persist(updated: UiTodo[]) {
    todosRef.current = updated;
    setTodos(updated);
    localStorage.setItem(TODOS_KEY, JSON.stringify(updated));
  }

  function enqueue(item: QueueItem) {
    saveQueue([...loadQueue(), item]);
  }

  async function flushQueue() {
    if (flushingRef.current) return;
    flushingRef.current = true;
    try {
      let queue = loadQueue();
      while (queue.length > 0) {
        const item = queue[0];
        try {
          if (item.type === "CREATE_TODO") {
            const result = await api.createTodo(
              item.payload.id,
              item.payload.description
            );
            persist(
              todosRef.current.map((t) =>
                t.id === item.payload.id
                  ? { ...result, syncStatus: "synced" as const }
                  : t
              )
            );
          } else if (item.type === "UPDATE_TODO") {
            const result = await api.updateTodo(
              item.payload.id,
              item.payload.description
            );
            persist(
              todosRef.current.map((t) =>
                t.id === item.payload.id
                  ? { ...result, syncStatus: "synced" as const }
                  : t
              )
            );
          } else if (item.type === "TOGGLE_TODO") {
            const result = await api.toggleTodo(
              item.payload.id,
              item.payload.completed
            );
            persist(
              todosRef.current.map((t) =>
                t.id === item.payload.id
                  ? { ...result, syncStatus: "synced" as const }
                  : t
              )
            );
          } else if (item.type === "DELETE_TODO") {
            await api.deleteTodo(item.payload.id);
          }
          queue = queue.slice(1);
          saveQueue(queue);
        } catch (err) {
          if (is409(err)) {
            queue = queue.slice(1);
            saveQueue(queue);
          } else {
            setError("Sync failed. Will retry when reconnected.");
            break;
          }
        }
      }
    } finally {
      flushingRef.current = false;
    }
  }

  async function loadFromNetwork() {
    setIsLoading(true);
    try {
      const fetched = await api.fetchTodos();
      const asSynced = fetched.map((t) => ({
        ...t,
        syncStatus: "synced" as const,
      }));
      persist(asSynced);
      setError(null);
    } catch {
      setError("Could not load todos.");
      persist(loadTodos());
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadFromNetwork();

    function handleOffline() {
      offlineRef.current = true;
      setOffline(true);
    }

    function handleOnline() {
      offlineRef.current = false;
      setOffline(false);
      loadFromNetwork().then(() => flushQueue());
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  function createTodo(description: string) {
    const id = crypto.randomUUID();
    const newTodo: UiTodo = {
      id,
      description,
      completed: false,
      createdAt: new Date().toISOString(),
      syncStatus: "pending",
    };
    persist([...todosRef.current, newTodo]);
    enqueue({ type: "CREATE_TODO", payload: { id, description } });
    if (!offlineRef.current) flushQueue();
  }

  function updateTodo(id: string, description: string) {
    persist(
      todosRef.current.map((t) =>
        t.id === id ? { ...t, description, syncStatus: "pending" } : t
      )
    );
    enqueue({ type: "UPDATE_TODO", payload: { id, description } });
    if (!offlineRef.current) flushQueue();
  }

  function toggleTodo(id: string) {
    const todo = todosRef.current.find((t) => t.id === id);
    if (!todo) return;
    const completed = !todo.completed;
    persist(
      todosRef.current.map((t) =>
        t.id === id ? { ...t, completed, syncStatus: "pending" } : t
      )
    );
    enqueue({ type: "TOGGLE_TODO", payload: { id, completed } });
    if (!offlineRef.current) flushQueue();
  }

  function deleteTodo(id: string) {
    persist(todosRef.current.filter((t) => t.id !== id));
    enqueue({ type: "DELETE_TODO", payload: { id } });
    if (!offlineRef.current) flushQueue();
  }

  return {
    todos,
    createTodo,
    updateTodo,
    toggleTodo,
    deleteTodo,
    offline,
    error,
    isLoading,
  };
}
