import { Injectable, type ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { type User } from "@licitafacil/shared";
import { UserService } from "../../user/user.service";

/**
 * Guard para bypass de autenticação em ambiente de desenvolvimento
 *
 * Funciona APENAS quando:
 * - AUTH_DEV_BYPASS=true
 * - NODE_ENV=development
 *
 * Aceita headers:
 * - x-dev-user-id: ID do usuário
 * - x-dev-empresa-id: ID da empresa
 *
 * Em qualquer outro ambiente, este guard não faz nada e a autenticação normal é usada.
 */
@Injectable()
export class DevBypassGuard {
  constructor(private readonly userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Verificar se bypass está habilitado
    const isDevBypassEnabled =
      process.env.AUTH_DEV_BYPASS === "true" && process.env.NODE_ENV === "development";

    if (!isDevBypassEnabled) {
      // Em produção ou quando bypass não está habilitado, não fazer nada
      // O JwtAuthGuard será executado normalmente
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.headers["x-dev-user-id"];
    const empresaId = request.headers["x-dev-empresa-id"];

    // Se não há headers DEV, deixar o JwtAuthGuard processar normalmente
    if (!userId || !empresaId) {
      return true;
    }

    // Buscar usuário no banco para garantir que existe
    try {
      const user = await this.userService.findByIdForTokenValidation(userId);

      if (!user) {
        throw new UnauthorizedException(
          `Usuário DEV não encontrado: ${userId}. Crie o usuário no banco primeiro.`,
        );
      }

      // Verificar se empresaId do header corresponde ao do usuário
      if (user.empresaId !== empresaId) {
        throw new UnauthorizedException(
          `Empresa DEV não corresponde ao usuário. Usuário pertence à empresa ${user.empresaId}, mas header enviou ${empresaId}`,
        );
      }

      // Criar objeto User mock no request
      const mockUser: User = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        empresaId: user.empresaId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      // Injetar usuário no request para que decorators como @CurrentUser() funcionem
      request.user = mockUser;

      // Retornar true para permitir acesso
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // Se erro ao buscar usuário, deixar JwtAuthGuard processar
      return true;
    }
  }
}
