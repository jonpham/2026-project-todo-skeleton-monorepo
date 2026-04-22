import { useTodoWorker } from "./hooks/useTodoWorker";
import { TodoInput } from "./components/TodoInput";
import { TodoItem } from "./components/TodoItem";

function App() {
  const { todos, createTodo, toggleTodo, updateTodo, deleteTodo } =
    useTodoWorker();

  return (
    <main className="mx-auto min-h-screen max-w-xl bg-gray-50 p-8">
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Todo PWA</h1>
      <TodoInput onSubmit={createTodo} />
      {/* placeholder list — replaced by TodoList in Step 5 */}
      <ul className="mt-4 space-y-2">
        {todos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={toggleTodo}
            onUpdate={updateTodo}
            onDelete={deleteTodo}
          />
        ))}
      </ul>
    </main>
  );
}

export default App;
