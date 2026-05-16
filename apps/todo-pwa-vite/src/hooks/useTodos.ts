import type { TodoHook } from "../types/todo";
import { useTodoApi } from "./useTodoApi";

export const useTodos: () => TodoHook = useTodoApi;
