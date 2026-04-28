import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { CreateTodoDto } from "./dto/create-todo.dto.js";
import { UpdateTodoDto } from "./dto/update-todo.dto.js";

@Injectable()
export class TodosService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.todo.findMany();
  }

  async findOne(id: string) {
    const todo = await this.prisma.todo.findUnique({ where: { id } });
    if (!todo) throw new NotFoundException(`Todo ${id} not found`);
    return todo;
  }

  create(dto: CreateTodoDto) {
    return this.prisma.todo.create({ data: dto });
  }

  async update(id: string, dto: UpdateTodoDto) {
    const todo = await this.prisma.todo.findUnique({ where: { id } });
    if (!todo) throw new NotFoundException(`Todo ${id} not found`);
    return this.prisma.todo.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const todo = await this.prisma.todo.findUnique({ where: { id } });
    if (!todo) throw new NotFoundException(`Todo ${id} not found`);
    return this.prisma.todo.delete({ where: { id } });
  }
}
