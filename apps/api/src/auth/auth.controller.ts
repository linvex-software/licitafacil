import {
  Controller,
  Post,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
  Req,
  Logger,
} from "@nestjs/common";
import { type Request } from "express";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import {
  createUserSchema,
  loginSchema,
  type AuthResponse,
  type User,
} from "@licitafacil/shared";

@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) { }

  /**
   * Registra um novo usuário
   * POST /auth/register
   */
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: unknown): Promise<AuthResponse> {
    // Validar dados com Zod
    const result = createUserSchema.safeParse(body);

    if (!result.success) {
      throw new BadRequestException({
        message: "Dados inválidos",
        errors: result.error.errors,
      });
    }

    return this.authService.register(result.data);
  }

  /**
   * Realiza login
   * POST /auth/login
   */
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: unknown, @Req() request: Request): Promise<AuthResponse> {
    // Validar dados com Zod
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      throw new BadRequestException({
        message: "Dados inválidos",
        errors: result.error.errors,
      });
    }

    return this.authService.login(result.data, request);
  }

  /**
   * Logout
   * POST /auth/logout
   */
  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: User) {
    this.logger.log(`[LOGOUT] Usuário ${user.email} (ID: ${user.id}) fez logout`);
    return {
      message: "Logout realizado com sucesso",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Solicita recuperação de senha (compatibilidade)
   * POST /auth/forgot-password
   */
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: { email?: string }) {
    if (!body.email) throw new BadRequestException("Email obrigatório.");
    await this.authService.requestPasswordReset(body.email);
    return { message: "Se o email existir, você receberá as instruções em breve." };
  }

  /**
   * Solicita recuperação de senha
   * POST /auth/request-password-reset
   */
  @Post("request-password-reset")
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body() body: { email?: string }) {
    if (!body.email) throw new BadRequestException("Email obrigatório.");
    await this.authService.requestPasswordReset(body.email);
    return { message: "Se o email existir, você receberá as instruções em breve." };
  }

  /**
   * Redefine a senha com o token recebido por email
   * POST /auth/reset-password
   */
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: { token?: string; password?: string; novaSenha?: string }) {
    const password = body.password ?? body.novaSenha;
    if (!body.token || !password) {
      throw new BadRequestException("Token e senha são obrigatórios.");
    }
    if (password.length < 6) {
      throw new BadRequestException("A senha deve ter pelo menos 6 caracteres.");
    }
    await this.authService.resetPassword(body.token, password);
    return { message: "Senha redefinida com sucesso!" };
  }

  /**
   * Altera a senha do usuário autenticado
   * PATCH /auth/me/senha
   */
  @Patch("me/senha")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async alterarSenha(
    @CurrentUser() user: User,
    @Body() body: { senhaAtual?: string; novaSenha?: string },
  ) {
    if (!body.senhaAtual || !body.novaSenha) {
      throw new BadRequestException("Senha atual e nova senha são obrigatórias.");
    }
    if (body.novaSenha.length < 6) {
      throw new BadRequestException("A nova senha deve ter pelo menos 6 caracteres.");
    }
    return this.authService.alterarSenha(user.id, body.senhaAtual, body.novaSenha);
  }

  /**
   * Atualiza o nome do usuário autenticado
   * PATCH /auth/me
   */
  @Patch("me")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async atualizarPerfil(
    @CurrentUser() user: User,
    @Body() body: { name?: string },
  ) {
    if (!body.name || body.name.trim().length < 2) {
      throw new BadRequestException("Nome deve ter pelo menos 2 caracteres.");
    }
    // Reutiliza o update do user service via prisma do auth service
    return this.authService.atualizarNome(user.id, body.name.trim());
  }
}
