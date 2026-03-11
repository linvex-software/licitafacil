import { Process, Processor } from "@nestjs/bull";
import { Job } from "bull";
import { DisputaService } from "./disputa.service";

@Processor("disputa")
export class DisputaProcessor {
  constructor(private readonly disputaService: DisputaService) {}

  @Process("iniciar")
  async processarDisputa(job: Job<{ disputaId: string }>) {
    await this.disputaService.processarDisputaAgendada(job.data.disputaId);
  }
}
