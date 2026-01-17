import { SetMetadata } from "@nestjs/common";
import { type UserRole } from "@licitafacil/shared";

export const ROLES_KEY = "roles";

/**
 * Decorator para especificar quais papéis podem acessar uma rota
 * 
 * Uso: @Roles(UserRole.ADMIN)
 *      @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
