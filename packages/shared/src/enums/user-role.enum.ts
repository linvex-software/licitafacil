/**
 * Papéis (Roles) de usuário no sistema
 */
export enum UserRole {
  ADMIN = "ADMIN",
  COLABORADOR = "COLABORADOR",
}

/**
 * Lista de todos os papéis disponíveis
 */
export const USER_ROLES = Object.values(UserRole);
