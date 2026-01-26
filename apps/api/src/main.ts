import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for development
  app.enableCors({
    origin: ["http://localhost:3000", "http://localhost:3002"],
    credentials: true,
  });

  // Get port from environment or default to 3001
  const port = process.env.PORT || 3001;

  await app.listen(port);
  console.log(`🚀 API running on http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
}

bootstrap();

