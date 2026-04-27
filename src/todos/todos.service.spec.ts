import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaService } from "../prisma/prisma.service.js";
import { TodosService } from "./todos.service.js";

const mockTodo = {
  id: "uuid-1",
  description: "Buy milk",
  completed: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrismaService = {
  todo: {
    findMany: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

describe("TodosService", () => {
  let service: TodosService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TodosService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TodosService>(TodosService);
  });

  it("findAll returns array of todos", async () => {
    mockPrismaService.todo.findMany.mockResolvedValue([mockTodo]);
    const result = await service.findAll();
    expect(result).toEqual([mockTodo]);
    expect(mockPrismaService.todo.findMany).toHaveBeenCalledOnce();
  });

  it("findOne returns a todo by id", async () => {
    mockPrismaService.todo.findUnique.mockResolvedValue(mockTodo);
    const result = await service.findOne("uuid-1");
    expect(result).toEqual(mockTodo);
    expect(mockPrismaService.todo.findUnique).toHaveBeenCalledWith({
      where: { id: "uuid-1" },
    });
  });

  it("findOne throws NotFoundException when not found", async () => {
    mockPrismaService.todo.findUnique.mockResolvedValue(null);
    await expect(service.findOne("missing")).rejects.toThrow(NotFoundException);
  });

  it("create returns the new todo", async () => {
    mockPrismaService.todo.create.mockResolvedValue(mockTodo);
    const result = await service.create({ description: "Buy milk" });
    expect(result).toEqual(mockTodo);
    expect(mockPrismaService.todo.create).toHaveBeenCalledWith({
      data: { description: "Buy milk" },
    });
  });

  it("update returns the updated todo", async () => {
    const updated = { ...mockTodo, completed: true };
    mockPrismaService.todo.findUnique.mockResolvedValue(mockTodo);
    mockPrismaService.todo.update.mockResolvedValue(updated);
    const result = await service.update("uuid-1", { completed: true });
    expect(result).toEqual(updated);
  });

  it("update throws NotFoundException when not found", async () => {
    mockPrismaService.todo.findUnique.mockResolvedValue(null);
    await expect(
      service.update("missing", { completed: true })
    ).rejects.toThrow(NotFoundException);
  });

  it("remove calls delete and returns the deleted todo", async () => {
    mockPrismaService.todo.findUnique.mockResolvedValue(mockTodo);
    mockPrismaService.todo.delete.mockResolvedValue(mockTodo);
    const result = await service.remove("uuid-1");
    expect(result).toEqual(mockTodo);
    expect(mockPrismaService.todo.delete).toHaveBeenCalledWith({
      where: { id: "uuid-1" },
    });
  });

  it("remove throws NotFoundException when not found", async () => {
    mockPrismaService.todo.findUnique.mockResolvedValue(null);
    await expect(service.remove("missing")).rejects.toThrow(NotFoundException);
  });
});
