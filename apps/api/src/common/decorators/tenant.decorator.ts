import { createParamDecorator, ExecutionContext, ForbiddenException } from "@nestjs/common";

/**
 * Decorator para extrair empresaId (tenantId) do usuário autenticado
 * 
 * Uso: @Tenant() empresaId: string
 * 
 * Requer que a rota esteja protegida com @UseGuards(JwtAuthGuard)
 */
export const Tenant = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.empresaId) {
      throw new ForbiddenException("Usuário não possui empresa associada");
    }

    return user.empresaId;
  },
);
