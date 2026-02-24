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
    const inicio = Date.now();
    this.logger.log("⏰ Cron ComprasNet iniciado às 7h");

    try {
      await this.comprasnetService.executarBuscasAutomaticas();
      const tempoDecorrido = ((Date.now() - inicio) / 1000).toFixed(1);
      this.logger.log(`✅ Cron ComprasNet finalizado em ${tempoDecorrido}s`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Erro no cron ComprasNet: ${msg}`);
      // Não quebrar - registrar erro mas continuar
    }
  }
}
