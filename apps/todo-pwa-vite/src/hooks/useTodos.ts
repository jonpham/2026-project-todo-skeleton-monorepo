import type { TodoHook } from "../types/todo";
import { useTodoWorker } from "./useTodoWorker";

export const useTodos: () => TodoHook = useTodoWorker;
