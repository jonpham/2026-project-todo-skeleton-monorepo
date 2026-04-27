import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module.js";
import { TodosModule } from "./todos/todos.module.js";

@Module({
  imports: [PrismaModule, TodosModule],
})
export class AppModule {}
