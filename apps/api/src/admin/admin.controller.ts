import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Query,
} from "@nestjs/common";
import { AdminService } from "./admin.service";
import { CriarClienteDto, ListarClientesDto } from "./dto";
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
}
