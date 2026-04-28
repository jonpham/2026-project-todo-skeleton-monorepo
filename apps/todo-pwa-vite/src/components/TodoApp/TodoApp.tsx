import { useTodoWorker } from "../../hooks/useTodoWorker";
import { TodoInput } from "../TodoInput";
import { TodoList } from "../TodoList";

export function TodoApp() {
  const { todos, createTodo, toggleTodo, updateTodo, deleteTodo } =
    useTodoWorker();

  return (
    <>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Todo PWA</h1>
      <TodoList
        todos={todos}
        onToggle={toggleTodo}
        onUpdate={updateTodo}
        onDelete={deleteTodo}
      />
      <TodoInput onSubmit={createTodo} />
    </>
  );
}
