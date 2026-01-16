import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import { type User } from "@licitafacil/shared";

/**
 * Controller de teste para demonstrar proteção de rotas
 * Este arquivo pode ser removido em produção
 */
@Controller("auth-test")
export class AuthTestController {
  /**
   * Rota protegida - requer autenticação
   * GET /auth-test/me
   */
  @Get("me")
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: User) {
    return {
      message: "Você está autenticado!",
      user,
    };
  }
}
