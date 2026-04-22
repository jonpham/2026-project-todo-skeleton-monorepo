import { useTodoWorker } from "./hooks/useTodoWorker";
import { TodoInput } from "./components/TodoInput";

function App() {
  const { todos, createTodo } = useTodoWorker();

  return (
    <main className="mx-auto min-h-screen max-w-xl bg-gray-50 p-8">
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Todo PWA</h1>
      <TodoInput onSubmit={createTodo} />
      {/* placeholder list — replaced by TodoList in Step 5 */}
      <ul className="mt-4 space-y-2">
        {todos.map((todo) => (
          <li
            key={todo.id}
            className="rounded border bg-white px-4 py-2 text-sm text-gray-800"
          >
            {todo.description}
          </li>
        ))}
      </ul>
    </main>
  );
}

export default App;
