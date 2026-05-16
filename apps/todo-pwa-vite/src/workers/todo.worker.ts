import {
  createTodo as apiCreateTodo,
  deleteTodo as apiDeleteTodo,
  fetchTodos,
  toggleTodo as apiToggleTodo,
  updateTodo as apiUpdateTodo,
} from "../api/todo-api-client";
import type { TodoItem, UiTodo } from "../types/todo";

type WorkerCommand =
  | { type: "INIT" }
  | { type: "CREATE_TODO"; payload: { description: string } }
  | { type: "UPDATE_TODO"; payload: { id: string; description: string } }
  | { type: "TOGGLE_TODO"; payload: { id: string } }
  | { type: "DELETE_TODO"; payload: { id: string } };

type QueueEntry =
  | {
      queueId: string;
      type: "CREATE_TODO";
      payload: { id: string; description: string };
    }
  | {
      queueId: string;
      type: "UPDATE_TODO";
      payload: { id: string; description: string };
    }
  | {
      queueId: string;
      type: "TOGGLE_TODO";
      payload: { id: string; completed: boolean };
    }
  | { queueId: string; type: "DELETE_TODO"; payload: { id: string } };

const DB_NAME = "todo-worker-store";
const DB_VERSION = 1;
const TODOS_STORE = "todos";
const QUEUE_STORE = "queue";

let dbPromise: Promise<IDBDatabase> | null = null;
let todos: UiTodo[] = [];
let offline = !self.navigator.onLine;
let error: string | null = null;
let isLoading = true;
let flushing = false;

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(TODOS_STORE)) {
        db.createObjectStore(TODOS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "queueId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDb();
  const tx = db.transaction(storeName, "readonly");
  return requestResult<T[]>(tx.objectStore(storeName).getAll());
}

async function replaceTodos(nextTodos: UiTodo[]): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(TODOS_STORE, "readwrite");
  const store = tx.objectStore(TODOS_STORE);
  await requestResult(store.clear());
  await Promise.all(nextTodos.map((todo) => requestResult(store.put(todo))));
}

async function putTodo(todo: UiTodo): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(TODOS_STORE, "readwrite");
  await requestResult(tx.objectStore(TODOS_STORE).put(todo));
}

async function removeTodo(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(TODOS_STORE, "readwrite");
  await requestResult(tx.objectStore(TODOS_STORE).delete(id));
}

async function enqueue(entry: QueueEntry): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(QUEUE_STORE, "readwrite");
  await requestResult(tx.objectStore(QUEUE_STORE).put(entry));
}

async function removeQueueEntry(queueId: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(QUEUE_STORE, "readwrite");
  await requestResult(tx.objectStore(QUEUE_STORE).delete(queueId));
}

function asSynced(todo: TodoItem): UiTodo {
  return { ...todo, syncStatus: "synced" };
}

function emit(): void {
  self.postMessage({ todos, offline, error, isLoading });
}

function isConflict(err: unknown): boolean {
  if (err instanceof Error) return err.message === "409";
  return (err as { status?: number })?.status === 409;
}

function queueId(): string {
  return `${Date.now()}-${crypto.randomUUID()}`;
}

async function loadFromApiIfSafe(): Promise<void> {
  const queue = await getAll<QueueEntry>(QUEUE_STORE);
  if (queue.length > 0 || offline) return;

  const fetched = (await fetchTodos()).map(asSynced);
  todos = fetched;
  await replaceTodos(fetched);
  error = null;
  emit();
}

async function flushQueue(): Promise<void> {
  if (flushing || offline) return;
  flushing = true;

  try {
    const queue = await getAll<QueueEntry>(QUEUE_STORE);
    for (const entry of queue) {
      try {
        if (entry.type === "CREATE_TODO") {
          const synced = asSynced(
            await apiCreateTodo(entry.payload.id, entry.payload.description)
          );
          todos = todos.map((todo) =>
            todo.id === entry.payload.id ? synced : todo
          );
          await putTodo(synced);
        }

        if (entry.type === "UPDATE_TODO") {
          const synced = asSynced(
            await apiUpdateTodo(entry.payload.id, entry.payload.description)
          );
          todos = todos.map((todo) =>
            todo.id === entry.payload.id ? synced : todo
          );
          await putTodo(synced);
        }

        if (entry.type === "TOGGLE_TODO") {
          const synced = asSynced(
            await apiToggleTodo(entry.payload.id, entry.payload.completed)
          );
          todos = todos.map((todo) =>
            todo.id === entry.payload.id ? synced : todo
          );
          await putTodo(synced);
        }

        if (entry.type === "DELETE_TODO") {
          await apiDeleteTodo(entry.payload.id);
        }

        await removeQueueEntry(entry.queueId);
        error = null;
        emit();
      } catch (err) {
        if (isConflict(err)) {
          await removeQueueEntry(entry.queueId);
          continue;
        }

        error = "Sync failed. Will retry when reconnected.";
        emit();
      }
    }
  } finally {
    flushing = false;
  }
}

async function init(): Promise<void> {
  isLoading = true;
  emit();

  todos = await getAll<UiTodo>(TODOS_STORE);
  isLoading = false;
  emit();

  try {
    await loadFromApiIfSafe();
    await flushQueue();
  } catch {
    error = "Could not load todos.";
    emit();
  }
}

async function createTodo(description: string): Promise<void> {
  const id = crypto.randomUUID();
  const todo: UiTodo = {
    id,
    description,
    completed: false,
    createdAt: new Date().toISOString(),
    syncStatus: "pending",
  };
  todos = [...todos, todo];
  await putTodo(todo);
  await enqueue({
    queueId: queueId(),
    type: "CREATE_TODO",
    payload: { id, description },
  });
  emit();
  await flushQueue();
}

async function updateTodo(id: string, description: string): Promise<void> {
  todos = todos.map((todo) =>
    todo.id === id ? { ...todo, description, syncStatus: "pending" } : todo
  );
  await replaceTodos(todos);
  await enqueue({
    queueId: queueId(),
    type: "UPDATE_TODO",
    payload: { id, description },
  });
  emit();
  await flushQueue();
}

async function toggleTodo(id: string): Promise<void> {
  const todo = todos.find((candidate) => candidate.id === id);
  if (!todo) return;

  const completed = !todo.completed;
  todos = todos.map((candidate) =>
    candidate.id === id
      ? { ...candidate, completed, syncStatus: "pending" }
      : candidate
  );
  await replaceTodos(todos);
  await enqueue({
    queueId: queueId(),
    type: "TOGGLE_TODO",
    payload: { id, completed },
  });
  emit();
  await flushQueue();
}

async function deleteTodo(id: string): Promise<void> {
  todos = todos.filter((todo) => todo.id !== id);
  await removeTodo(id);
  await enqueue({ queueId: queueId(), type: "DELETE_TODO", payload: { id } });
  emit();
  await flushQueue();
}

self.addEventListener("message", (event: MessageEvent<WorkerCommand>) => {
  const command = event.data;
  const run = async () => {
    if (command.type === "INIT") await init();
    if (command.type === "CREATE_TODO")
      await createTodo(command.payload.description);
    if (command.type === "UPDATE_TODO") {
      await updateTodo(command.payload.id, command.payload.description);
    }
    if (command.type === "TOGGLE_TODO") await toggleTodo(command.payload.id);
    if (command.type === "DELETE_TODO") await deleteTodo(command.payload.id);
  };

  run().catch(() => {
    error = "Todo worker failed.";
    isLoading = false;
    emit();
  });
});

self.addEventListener("offline", () => {
  offline = true;
  emit();
});

self.addEventListener("online", () => {
  offline = false;
  emit();
  flushQueue().catch(() => {
    error = "Sync failed. Will retry when reconnected.";
    emit();
  });
});
