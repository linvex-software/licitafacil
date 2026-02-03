import { Module } from "@nestjs/common";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";
import { PlanoModule } from "../plano/plano.module";

@Module({
  imports: [PlanoModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService], // Exportar para uso no AuthModule
})
export class UserModule {}
