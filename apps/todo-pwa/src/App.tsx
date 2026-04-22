import { useTodoWorker } from "./hooks/useTodoWorker";
import { TodoInput } from "./components/TodoInput";
import { TodoList } from "./components/TodoList";

function App() {
  const { todos, createTodo, toggleTodo, updateTodo, deleteTodo } =
    useTodoWorker();

  return (
    <main className="mx-auto min-h-screen max-w-xl bg-gray-50 p-8">
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Todo PWA</h1>
      <TodoInput onSubmit={createTodo} />
      <TodoList
        todos={todos}
        onToggle={toggleTodo}
        onUpdate={updateTodo}
        onDelete={deleteTodo}
      />
    </main>
  );
}

export default App;
