import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import type { CreateTodoDto as SharedCreateTodoDto } from "@jonpham/2026-project-todo-types";

export class CreateTodoDto implements SharedCreateTodoDto {
  @ApiPropertyOptional({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ example: "Buy milk" })
  @IsString()
  @IsNotEmpty()
  description: string;
}
