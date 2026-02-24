import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  Logger,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole } from "@licitafacil/shared";
import { ComprasnetService } from "./comprasnet.service";
import { ComprasnetCronService } from "./comprasnet-cron.service";
import type { FiltrosBusca } from "./comprasnet-scraper.service";

@Controller("integracoes/comprasnet")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComprasnetController {
  private readonly logger = new Logger(ComprasnetController.name);

  constructor(
    private comprasnetService: ComprasnetService,
    private comprasnetCronService: ComprasnetCronService,
  ) {}

  @Post("buscar")
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.COLABORADOR)
  async buscar(@Request() req: any, @Body() filtros: FiltrosBusca) {
    return this.comprasnetService.buscar(req.user.empresaId, filtros);
  }

  @Post("importar")
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.COLABORADOR)
  async importar(@Request() req: any, @Body() body: { licitacoes: any[] }) {
    return this.comprasnetService.importar(req.user.empresaId, body.licitacoes);
  }

  @Post("buscas-salvas")
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async salvarBusca(
    @Request() req: any,
    @Body() body: { nome: string; filtros: FiltrosBusca; autoImportar?: boolean },
  ) {
    return this.comprasnetService.salvarBusca(
      req.user.empresaId,
      body.nome,
      body.filtros,
      body.autoImportar || false,
    );
  }

  @Get("buscas-salvas")
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.COLABORADOR)
  async listarBuscas(@Request() req: any) {
    return this.comprasnetService.listarBuscas(req.user.empresaId);
  }

  @Delete("buscas-salvas/:id")
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async deletarBusca(@Request() req: any, @Param("id") id: string) {
    return this.comprasnetService.deletarBusca(id, req.user.empresaId);
  }

  @Post("test-duplicata")
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async testDuplicata(
    @Request() req: any,
    @Body() body: { licitacoes: any[] },
  ) {
    const resultado = [];
    for (const lic of body.licitacoes) {
      const isDuplicata = await this.comprasnetService.verificarDuplicata(
        req.user.empresaId,
        lic,
      );
      resultado.push({ ...lic, isDuplicata });
    }
    return resultado;
  }

  // Endpoint para testar cron manualmente
  @Post("test-cron")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async testCron() {
    this.logger.log("🧪 Disparando cron manualmente para teste...");
    await this.comprasnetCronService.executarBuscasAutomaticas();
    return {
      success: true,
      message: "Cron executado com sucesso. Verifique os logs e emails.",
    };
  }
}
