import { Controller, Get, UseGuards } from "@nestjs/common";
import { UserService } from "./user.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Tenant } from "../common/decorators/tenant.decorator";
import { type User, UserRole } from "@licitafacil/shared";

@Controller("users")
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Lista todos os usuários da empresa do usuário autenticado
   * GET /users
   * 
   * Permissão: ADMIN e COLABORADOR podem ver
   * Isolamento: Só retorna usuários da mesma empresa
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async findAll(@Tenant() empresaId: string): Promise<User[]> {
    return this.userService.findAll(empresaId);
  }
}
