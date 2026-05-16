import { Controller, Get, Inject, VERSION_NEUTRAL } from "@nestjs/common";
import { HealthCheck, HealthCheckService } from "@nestjs/terminus";

@Controller({ path: "health", version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    @Inject(HealthCheckService) private readonly health: HealthCheckService
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([]);
  }
}
