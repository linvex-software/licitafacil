import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { AppModule } from "./app.module";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

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

  app.useStaticAssets(join(process.cwd(), "uploads"), {
    prefix: "/uploads/",
    setHeaders: (res: any, filePath: string) => {
      if (filePath.endsWith(".pdf")) {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline");
      }
      if (filePath.match(/\.(png)$/i)) {
        res.setHeader("Content-Type", "image/png");
      }
      if (filePath.match(/\.(jpg|jpeg)$/i)) {
        res.setHeader("Content-Type", "image/jpeg");
      }
    },
  });

  // Get port from environment or default to 3001
  const port = process.env.PORT || 3001;

  await app.listen(port, "0.0.0.0");
  logger.log(`API running on http://0.0.0.0:${port}`);
  logger.log(`Health check: http://0.0.0.0:${port}/health`);
  logger.log("Alerts WebSocket: namespace /alerts-ws");
}

bootstrap();

