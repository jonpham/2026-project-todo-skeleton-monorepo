export type TodoItem = {
  id: string;
  description: string;
  completed: boolean;
  createdAt: string;
};

type WorkerMessage =
  | { type: "LOAD_TODOS"; payload: { todos: TodoItem[] } }
  | { type: "CREATE_TODO"; payload: { description: string } }
  | { type: "UPDATE_TODO"; payload: { id: string; description: string } }
  | { type: "TOGGLE_TODO"; payload: { id: string } }
  | { type: "DELETE_TODO"; payload: { id: string } };

let todos: TodoItem[] = [];

function reply(): void {
  self.postMessage({ todos });
}

self.addEventListener("message", (event: MessageEvent<WorkerMessage>) => {
  const msg = event.data;

  switch (msg.type) {
    case "LOAD_TODOS":
      todos = msg.payload.todos;
      reply();
      break;

    case "CREATE_TODO":
      todos = [
        ...todos,
        {
          id: crypto.randomUUID(),
          description: msg.payload.description,
          completed: false,
          createdAt: new Date().toISOString(),
        },
      ];
      reply();
      break;

    case "UPDATE_TODO":
      todos = todos.map((t) =>
        t.id === msg.payload.id
          ? { ...t, description: msg.payload.description }
          : t
      );
      reply();
      break;

    case "TOGGLE_TODO":
      todos = todos.map((t) =>
        t.id === msg.payload.id ? { ...t, completed: !t.completed } : t
      );
      reply();
      break;

    case "DELETE_TODO":
      todos = todos.filter((t) => t.id !== msg.payload.id);
      reply();
      break;
  }
});
