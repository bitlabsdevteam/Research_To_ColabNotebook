import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  });
  await app.listen(3001);
  console.log("API running on http://localhost:3001");
}
bootstrap();
