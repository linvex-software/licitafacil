import { Module } from "@nestjs/common";
import { EmpresaController } from "./empresa.controller";
import { EmpresaService } from "./empresa.service";

@Module({
  controllers: [EmpresaController],
  providers: [EmpresaService],
  exports: [EmpresaService], // Exportar para ser usado em outros módulos (ex: AuthModule)
})
export class EmpresaModule {}
