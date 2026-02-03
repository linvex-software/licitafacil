import { Module } from "@nestjs/common";
import { PlanoController } from "./plano.controller";
import { PlanoService } from "./plano.service";
import { PlanoLimitValidator } from "./validators/plano-limit.validator";

@Module({
  controllers: [PlanoController],
  providers: [PlanoService, PlanoLimitValidator],
  exports: [PlanoService],
})
export class PlanoModule {}
