import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";
import type { UpdateTodoDto as SharedUpdateTodoDto } from "@jonpham/2026-project-todo-types";

export class UpdateTodoDto implements SharedUpdateTodoDto {
  @ApiPropertyOptional({ example: "Buy milk" })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  completed?: boolean;
}
