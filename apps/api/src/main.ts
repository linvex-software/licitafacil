import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { IoAdapter } from "@nestjs/platform-socket.io";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // WebSocket: Socket.IO (single server, sem Redis)
  app.useWebSocketAdapter(new IoAdapter(app));

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
  console.log(`🔔 Alerts WebSocket: ws path /alerts-ws`);
}

bootstrap();

