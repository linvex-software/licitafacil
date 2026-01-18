import { Module } from "@nestjs/common";
import { BidController } from "./bid.controller";
import { BidService } from "./bid.service";

@Module({
  controllers: [BidController],
  providers: [BidService],
  exports: [BidService], // Exportar para uso em outros módulos, se necessário
})
export class BidModule {}
