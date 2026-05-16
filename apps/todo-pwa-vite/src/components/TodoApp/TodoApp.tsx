import type { TodoHook } from "../../types/todo";
import { TodoInput } from "../TodoInput";
import { TodoList } from "../TodoList";

type Props = Pick<
  TodoHook,
  "todos" | "createTodo" | "updateTodo" | "toggleTodo" | "deleteTodo"
>;

export function TodoApp({
  todos,
  createTodo,
  updateTodo,
  toggleTodo,
  deleteTodo,
}: Props) {
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
