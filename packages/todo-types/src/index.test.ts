import { describe, expect, it } from "vitest";

import {
  CreateTodoDtoSchema,
  TodoItemSchema,
  UpdateTodoDtoSchema,
} from "./index";

describe("TodoItemSchema", () => {
  it("accepts a valid todo item", () => {
    const parsed = TodoItemSchema.parse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      description: "Write Task 1 tests first",
      completed: false,
      createdAt: "2026-04-28T16:00:00.000Z",
    });

    expect(parsed).toEqual({
      id: "550e8400-e29b-41d4-a716-446655440000",
      description: "Write Task 1 tests first",
      completed: false,
      createdAt: "2026-04-28T16:00:00.000Z",
    });
  });

  it("rejects a todo item with a missing description", () => {
    const result = TodoItemSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      completed: false,
      createdAt: "2026-04-28T16:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a todo item with a missing createdAt wire field", () => {
    const result = TodoItemSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      description: "Missing timestamp",
      completed: false,
    });

    expect(result.success).toBe(false);
  });
});

describe("CreateTodoDtoSchema", () => {
  it("accepts creation without an id", () => {
    const parsed = CreateTodoDtoSchema.parse({
      description: "Create from server input",
    });

    expect(parsed).toEqual({
      description: "Create from server input",
    });
  });

  it("accepts creation with a valid uuid id", () => {
    const parsed = CreateTodoDtoSchema.parse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      description: "Client-generated id",
    });

    expect(parsed).toEqual({
      id: "550e8400-e29b-41d4-a716-446655440000",
      description: "Client-generated id",
    });
  });

  it("rejects creation with a non-uuid id", () => {
    const result = CreateTodoDtoSchema.safeParse({
      id: "not-a-uuid",
      description: "Bad id",
    });

    expect(result.success).toBe(false);
  });
});

describe("UpdateTodoDtoSchema", () => {
  it("accepts a partial update", () => {
    const parsed = UpdateTodoDtoSchema.parse({
      completed: true,
    });

    expect(parsed).toEqual({
      completed: true,
    });
  });

  it("rejects id because it is not updateable", () => {
    const result = UpdateTodoDtoSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
    });

    expect(result.success).toBe(false);
  });

  it("rejects an empty update object", () => {
    const result = UpdateTodoDtoSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("rejects updates whose provided fields are only undefined", () => {
    const result = UpdateTodoDtoSchema.safeParse({
      description: undefined,
    });

    expect(result.success).toBe(false);
  });
});
