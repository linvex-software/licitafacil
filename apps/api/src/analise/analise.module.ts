import { Module } from "@nestjs/common";
import { AnaliseController } from "./analise.controller";
import { AnaliseService } from "./analise.service";

@Module({
  controllers: [AnaliseController],
  providers: [AnaliseService],
  exports: [AnaliseService],
})
export class AnaliseModule {}
