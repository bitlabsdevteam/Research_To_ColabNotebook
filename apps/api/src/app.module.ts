import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { GenerateModule } from "./generate/generate.module";

@Module({
  imports: [GenerateModule],
  controllers: [HealthController],
})
export class AppModule {}
