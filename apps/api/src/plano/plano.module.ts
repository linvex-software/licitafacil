import { Module } from "@nestjs/common";
import { PlanoController } from "./plano.controller";
import { PlanoService } from "./plano.service";
import { PlanoLimitValidator } from "./validators/plano-limit.validator";
import { AssinaturaModule } from "../assinatura/assinatura.module";

@Module({
  imports: [AssinaturaModule],
  controllers: [PlanoController],
  providers: [PlanoService, PlanoLimitValidator],
  exports: [PlanoService],
})
export class PlanoModule {}
