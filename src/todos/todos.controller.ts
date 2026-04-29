import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CreateTodoDto } from "./dto/create-todo.dto.js";
import { UpdateTodoDto } from "./dto/update-todo.dto.js";
import { TodoEntity } from "./entities/todo.entity.js";
import { TodosService } from "./todos.service.js";

@ApiTags("todos")
@Controller({ version: "1", path: "todos" })
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: "List all todos" })
  @ApiResponse({ status: 200, type: [TodoEntity] })
  findAll() {
    return this.todosService.findAll();
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: "Create a todo" })
  @ApiResponse({ status: 201, type: TodoEntity })
  create(@Body() dto: CreateTodoDto) {
    return this.todosService.create(dto);
  }

  @Get(":id")
  @HttpCode(200)
  @ApiOperation({ summary: "Get a todo by id" })
  @ApiResponse({ status: 200, type: TodoEntity })
  @ApiResponse({ status: 404, description: "Not found" })
  findOne(@Param("id") id: string) {
    return this.todosService.findOne(id);
  }

  @Patch(":id")
  @HttpCode(200)
  @ApiOperation({ summary: "Update a todo" })
  @ApiResponse({ status: 200, type: TodoEntity })
  @ApiResponse({ status: 404, description: "Not found" })
  update(@Param("id") id: string, @Body() dto: UpdateTodoDto) {
    return this.todosService.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Delete a todo" })
  @ApiResponse({ status: 204, description: "Deleted" })
  @ApiResponse({ status: 404, description: "Not found" })
  remove(@Param("id") id: string) {
    return this.todosService.remove(id);
  }
}
