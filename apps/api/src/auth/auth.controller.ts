import {
  Controller,
  Post,
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

  constructor(private readonly authService: AuthService) {}

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
   * Realiza logout (simbólico)
   * POST /auth/logout
   *
   * Nota: Com JWT stateless, o logout real é feito no frontend
   * removendo o token. Este endpoint serve apenas para logs/auditoria.
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
}
