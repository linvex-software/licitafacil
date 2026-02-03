import { Module } from "@nestjs/common";
import { EmpresaController } from "./empresa.controller";
import { EmpresaService } from "./empresa.service";
import { PlanoModule } from "../plano/plano.module";
import { AssinaturaModule } from "../assinatura/assinatura.module";

@Module({
  imports: [PlanoModule, AssinaturaModule],
  controllers: [EmpresaController],
  providers: [EmpresaService],
  exports: [EmpresaService], // Exportar para ser usado em outros módulos (ex: AuthModule)
})
export class EmpresaModule {}
