import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { type User } from "@licitafacil/shared";

/**
 * Decorator para extrair o usuário autenticado do request
 * Uso: @CurrentUser() user: User
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
