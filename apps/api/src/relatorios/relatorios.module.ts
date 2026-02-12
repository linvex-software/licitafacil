import { Module } from "@nestjs/common";
import { RelatoriosController } from "./relatorios.controller";
import { RelatoriosService } from "./relatorios.service";
import { PdfService } from "./pdf.service";
import { EmailModule } from "../email/email.module";

@Module({
  imports: [EmailModule],
  controllers: [RelatoriosController],
  providers: [RelatoriosService, PdfService],
})
export class RelatoriosModule {}
