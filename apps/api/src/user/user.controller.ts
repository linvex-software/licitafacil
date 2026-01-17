import { Controller, Get, UseGuards } from "@nestjs/common";
import { UserService } from "./user.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Tenant } from "../common/decorators/tenant.decorator";
import { type User } from "@licitafacil/shared";

@Controller("users")
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Lista todos os usuários da empresa do usuário autenticado
   * GET /users
   * 
   * Isolamento: Só retorna usuários da mesma empresa
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Tenant() empresaId: string): Promise<User[]> {
    return this.userService.findAll(empresaId);
  }
}
