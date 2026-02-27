import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { AppModule } from "./app.module";
import { IoAdapter } from "@nestjs/platform-socket.io";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  // Validação global de DTOs (class-validator)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove campos não decorados
      forbidNonWhitelisted: true, // Rejeita campos não permitidos
      transform: true, // Auto-transforma tipos (string → number, etc.)
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // WebSocket: Socket.IO (single server, sem Redis)
  app.useWebSocketAdapter(new IoAdapter(app));

  const envOrigins = (process.env.FRONTEND_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: [...envOrigins, "http://localhost:3000", "http://localhost:3002"],
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // Get port from environment or default to 3001
  const port = process.env.PORT || 3001;

  await app.listen(port);
  logger.log(`API running on http://localhost:${port}`);
  logger.log(`Health check: http://localhost:${port}/health`);
  logger.log("Alerts WebSocket: namespace /alerts-ws");
}

bootstrap();

