import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Query,
} from "@nestjs/common";
import { AdminService } from "./admin.service";
import {
  CriarClienteDto,
  ListarClientesDto,
  CriarContratoDto,
  RegistrarPagamentoDto,
  PatchBillingPlanDto,
  PatchBillingStatusDto,
  PatchBillingExtendDto,
} from "./dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UserRole } from "@licitafacil/shared";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post("clientes")
  @Roles(UserRole.SUPER_ADMIN)
  async criarCliente(
    @Body() dto: CriarClienteDto,
    @CurrentUser() user: { id: string; empresaId: string },
  ) {
    return this.adminService.criarCliente(dto, user.id, user.empresaId);
  }

  @Get("clientes")
  @Roles(UserRole.SUPER_ADMIN)
  async listarClientes(@Query() dto: ListarClientesDto) {
    return this.adminService.listarClientes(dto);
  }

  @Get("clientes/estatisticas")
  @Roles(UserRole.SUPER_ADMIN)
  async obterEstatisticas() {
    return this.adminService.obterEstatisticas();
  }

  // ========================================================
  // Uso de Limites
  // ========================================================

  @Get("clientes/:id/uso")
  @Roles(UserRole.SUPER_ADMIN)
  async obterUso(@Param("id") empresaId: string) {
    return this.adminService.obterUsoCliente(empresaId);
  }

  // ========================================================
  // Contratos
  // ========================================================

  @Post("contratos")
  @Roles(UserRole.SUPER_ADMIN)
  async criarContrato(@Body() dto: CriarContratoDto) {
    return this.adminService.criarContrato(dto);
  }

  @Get("contratos/:empresaId")
  @Roles(UserRole.SUPER_ADMIN)
  async obterContrato(@Param("empresaId") empresaId: string) {
    return this.adminService.obterContrato(empresaId);
  }

  // ========================================================
  // Pagamentos
  // ========================================================

  @Post("pagamentos")
  @Roles(UserRole.SUPER_ADMIN)
  async registrarPagamento(@Body() dto: RegistrarPagamentoDto) {
    return this.adminService.registrarPagamento(dto);
  }

  @Get("contratos/:contratoId/pagamentos")
  @Roles(UserRole.SUPER_ADMIN)
  async listarPagamentos(@Param("contratoId") contratoId: string) {
    return this.adminService.listarPagamentos(contratoId);
  }

  // ========================================================
  // Billing (PL-03)
  // ========================================================

  @Patch("billing/:companyId/plan")
  @Roles(UserRole.SUPER_ADMIN)
  async patchBillingPlan(
    @Param("companyId") companyId: string,
    @Body() dto: PatchBillingPlanDto,
    @CurrentUser() user: { id: string; empresaId: string },
  ) {
    return this.adminService.patchBillingPlan(companyId, dto, user.id);
  }

  @Patch("billing/:companyId/status")
  @Roles(UserRole.SUPER_ADMIN)
  async patchBillingStatus(
    @Param("companyId") companyId: string,
    @Body() dto: PatchBillingStatusDto,
    @CurrentUser() user: { id: string; empresaId: string },
  ) {
    return this.adminService.patchBillingStatus(companyId, dto, user.id);
  }

  @Patch("billing/:companyId/extend")
  @Roles(UserRole.SUPER_ADMIN)
  async patchBillingExtend(
    @Param("companyId") companyId: string,
    @Body() dto: PatchBillingExtendDto,
    @CurrentUser() user: { id: string; empresaId: string },
  ) {
    return this.adminService.patchBillingExtend(companyId, dto, user.id);
  }

  @Get("billing/:companyId/audit")
  @Roles(UserRole.SUPER_ADMIN)
  async listarBillingAudit(@Param("companyId") companyId: string) {
    return this.adminService.listarBillingAudit(companyId);
  }
}
