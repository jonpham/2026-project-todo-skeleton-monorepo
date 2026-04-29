import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { HealthController } from "./health/health.controller.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { TodosModule } from "./todos/todos.module.js";

@Module({
  imports: [PrismaModule, TodosModule, TerminusModule],
  controllers: [HealthController],
})
export class AppModule {}
