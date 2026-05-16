import { useTodos } from "./hooks/useTodos";
import { TodoApp } from "./components/TodoApp";

function App() {
  const {
    todos,
    createTodo,
    updateTodo,
    toggleTodo,
    deleteTodo,
    offline,
    error,
  } = useTodos();

  return (
    <main className="mx-auto min-h-screen max-w-xl bg-gray-50 p-8">
      {offline && (
        <div className="mb-4 rounded bg-amber-100 px-4 py-2 text-sm text-amber-800">
          You are offline — changes will sync when reconnected.
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="mb-4 rounded bg-red-100 px-4 py-2 text-sm text-red-800"
        >
          {error}
        </div>
      )}
      <TodoApp
        todos={todos}
        createTodo={createTodo}
        updateTodo={updateTodo}
        toggleTodo={toggleTodo}
        deleteTodo={deleteTodo}
      />
    </main>
  );
}

export default App;
