import { Module } from "@nestjs/common";
import { UserService } from "./user.service";

@Module({
  providers: [UserService],
  exports: [UserService], // Exportar para uso no AuthModule
})
export class UserModule {}
