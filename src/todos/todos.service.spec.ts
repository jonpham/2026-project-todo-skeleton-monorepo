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

  describe("findOrFail (via findOne)", () => {
    it("returns the todo when it exists", async () => {
      mockPrismaService.todo.findUnique.mockResolvedValue(mockTodo);
      const result = await service.findOne("uuid-1");
      expect(result).toEqual(mockTodo);
      expect(mockPrismaService.todo.findUnique).toHaveBeenCalledWith({
        where: { id: "uuid-1" },
      });
    });

    it("throws NotFoundException when todo does not exist", async () => {
      mockPrismaService.todo.findUnique.mockResolvedValue(null);
      await expect(service.findOne("missing-id")).rejects.toThrow(
        "Todo missing-id not found"
      );
    });
  });

  describe("create", () => {
    it("passes client-provided id to Prisma", async () => {
      const clientId = "550e8400-e29b-41d4-a716-446655440000";
      const dto = { id: clientId, description: "Test todo" };
      mockPrismaService.todo.create.mockResolvedValue({
        ...mockTodo,
        id: clientId,
      });

      const result = await service.create(dto);

      expect(mockPrismaService.todo.create).toHaveBeenCalledWith({
        data: { id: clientId, description: "Test todo" },
      });
      expect(result.id).toBe(clientId);
    });

    it("creates todo without id (server generates UUID)", async () => {
      const dto = { description: "Test todo" };
      mockPrismaService.todo.create.mockResolvedValue(mockTodo);

      await service.create(dto);

      expect(mockPrismaService.todo.create).toHaveBeenCalledWith({
        data: { description: "Test todo" },
      });
    });
  });
});
