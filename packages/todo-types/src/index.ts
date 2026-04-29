import { z } from "zod";

const todoIdSchema = z.uuid();
const descriptionSchema = z.string().min(1);
const createdAtSchema = z.string().datetime();

export const TodoItemSchema = z.object({
  id: todoIdSchema,
  description: descriptionSchema,
  completed: z.boolean(),
  createdAt: createdAtSchema,
});

export type TodoItem = z.infer<typeof TodoItemSchema>;

export const CreateTodoDtoSchema = z.object({
  id: todoIdSchema.optional(),
  description: descriptionSchema,
});

export type CreateTodoDto = z.infer<typeof CreateTodoDtoSchema>;

export const UpdateTodoDtoSchema = z
  .object({
    description: descriptionSchema,
    completed: z.boolean(),
  })
  .partial()
  .strict()
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    {
      message: "At least one update field is required",
    }
  );

export type UpdateTodoDto = z.infer<typeof UpdateTodoDtoSchema>;
