import { Test, TestingModule } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TodosController } from "./todos.controller.js";
import { TodosService } from "./todos.service.js";

const mockTodo = {
  id: "uuid-1",
  description: "Buy milk",
  completed: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTodosService = {
  findAll: vi.fn(),
  findOne: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
};

describe("TodosController", () => {
  let controller: TodosController;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TodosController],
      providers: [{ provide: TodosService, useValue: mockTodosService }],
    }).compile();

    controller = module.get<TodosController>(TodosController);
  });

  it("findAll delegates to service.findAll", async () => {
    mockTodosService.findAll.mockResolvedValue([mockTodo]);
    const result = await controller.findAll();
    expect(result).toEqual([mockTodo]);
    expect(mockTodosService.findAll).toHaveBeenCalledOnce();
  });

  it("create delegates to service.create", async () => {
    mockTodosService.create.mockResolvedValue(mockTodo);
    const result = await controller.create({ description: "Buy milk" });
    expect(result).toEqual(mockTodo);
    expect(mockTodosService.create).toHaveBeenCalledWith({
      description: "Buy milk",
    });
  });

  it("findOne delegates to service.findOne", async () => {
    mockTodosService.findOne.mockResolvedValue(mockTodo);
    const result = await controller.findOne("uuid-1");
    expect(result).toEqual(mockTodo);
    expect(mockTodosService.findOne).toHaveBeenCalledWith("uuid-1");
  });

  it("update delegates to service.update", async () => {
    const updated = { ...mockTodo, completed: true };
    mockTodosService.update.mockResolvedValue(updated);
    const result = await controller.update("uuid-1", { completed: true });
    expect(result).toEqual(updated);
    expect(mockTodosService.update).toHaveBeenCalledWith("uuid-1", {
      completed: true,
    });
  });

  it("remove delegates to service.remove", async () => {
    mockTodosService.remove.mockResolvedValue(mockTodo);
    const result = await controller.remove("uuid-1");
    expect(result).toEqual(mockTodo);
    expect(mockTodosService.remove).toHaveBeenCalledWith("uuid-1");
  });
});
