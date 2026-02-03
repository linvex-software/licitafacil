import { Module } from "@nestjs/common";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";
import { PlanoModule } from "../plano/plano.module";
import { AssinaturaModule } from "../assinatura/assinatura.module";

@Module({
  imports: [PlanoModule, AssinaturaModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService], // Exportar para uso no AuthModule
})
export class UserModule {}
