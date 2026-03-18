import { Module } from "@nestjs/common";
import { AnaliseController } from "./analise.controller";
import { AnaliseService } from "./analise.service";
import { AnaliseConcorrentesController } from "./analise-concorrentes.controller";
import { AnaliseConcorrentesService } from "./analise-concorrentes.service";

@Module({
  controllers: [AnaliseController, AnaliseConcorrentesController],
  providers: [AnaliseService, AnaliseConcorrentesService],
  exports: [AnaliseService, AnaliseConcorrentesService],
})
export class AnaliseModule {}
