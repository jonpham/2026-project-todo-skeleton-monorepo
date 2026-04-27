import { ApiProperty } from "@nestjs/swagger";

export class TodoEntity {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  description: string;

  @ApiProperty({ type: Boolean })
  completed: boolean;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
