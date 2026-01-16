import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { HealthController } from "./health/health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { EmpresaModule } from "./empresa/empresa.module";
import { UserModule } from "./user/user.module";
import { AuthModule } from "./auth/auth.module";

@Module({
  imports: [PrismaModule, EmpresaModule, UserModule, AuthModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}

