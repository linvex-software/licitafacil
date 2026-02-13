import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { ComprasnetService } from "./comprasnet.service";

@Injectable()
export class ComprasnetCronService {
  private readonly logger = new Logger(ComprasnetCronService.name);

  constructor(private comprasnetService: ComprasnetService) {}

  // Todo dia às 7h
  @Cron("0 7 * * *")
  async executarBuscasAutomaticas(): Promise<void> {
    this.logger.log("Cron ComprasNet iniciado (7h)");
    await this.comprasnetService.executarBuscasAutomaticas();
    this.logger.log("Cron ComprasNet finalizado");
  }
}
