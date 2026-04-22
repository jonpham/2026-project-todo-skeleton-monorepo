export type TodoItem = {
  id: string;
  description: string;
  completed: boolean;
  createdAt: string;
};

type WorkerMessage =
  | { type: "GET_ALL_TODOS" }
  | { type: "CREATE_TODO"; payload: { description: string } }
  | { type: "UPDATE_TODO"; payload: { id: string; description: string } }
  | { type: "TOGGLE_TODO"; payload: { id: string } }
  | { type: "DELETE_TODO"; payload: { id: string } };

const STORAGE_KEY = "todos";

function load(): TodoItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(todos: TodoItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function reply(todos: TodoItem[]): void {
  self.postMessage({ todos });
}

self.addEventListener("message", (event: MessageEvent<WorkerMessage>) => {
  const msg = event.data;
  let todos = load();

  switch (msg.type) {
    case "GET_ALL_TODOS":
      reply(todos);
      break;

    case "CREATE_TODO": {
      const item: TodoItem = {
        id: crypto.randomUUID(),
        description: msg.payload.description,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      todos = [...todos, item];
      save(todos);
      reply(todos);
      break;
    }

    case "UPDATE_TODO":
      todos = todos.map((t) =>
        t.id === msg.payload.id
          ? { ...t, description: msg.payload.description }
          : t
      );
      save(todos);
      reply(todos);
      break;

    case "TOGGLE_TODO":
      todos = todos.map((t) =>
        t.id === msg.payload.id ? { ...t, completed: !t.completed } : t
      );
      save(todos);
      reply(todos);
      break;

    case "DELETE_TODO":
      todos = todos.filter((t) => t.id !== msg.payload.id);
      save(todos);
      reply(todos);
      break;
  }
});
