import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthTestController } from "./auth-test.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { DevBypassGuard } from "./guards/dev-bypass.guard";
import { UserModule } from "../user/user.module";
import { EmpresaModule } from "../empresa/empresa.module";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { EmailModule } from "../email/email.module";

@Module({
  imports: [
    UserModule,
    EmpresaModule,
    AuditLogModule,
    EmailModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key-change-in-production",
      signOptions: {
        expiresIn: "24h",
      },
    }),
  ],
  controllers: [AuthController, AuthTestController],
  providers: [AuthService, JwtStrategy, DevBypassGuard],
  exports: [AuthService, DevBypassGuard],
})
export class AuthModule { }
