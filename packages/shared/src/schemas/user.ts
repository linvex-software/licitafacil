import { z } from "zod";

/**
 * Schema para criação de usuário (dados de entrada - sem senha hasheada)
 */
export const createUserSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  name: z.string().min(1, "Nome é obrigatório").max(255, "Nome muito longo"),
  empresaId: z.string().uuid("ID da empresa inválido"),
});

/**
 * Schema de login
 */
export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

/**
 * Schema completo de User (resposta da API - sem senha)
 */
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  empresaId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Schema de resposta de autenticação (login)
 */
export const authResponseSchema = z.object({
  user: userSchema,
  accessToken: z.string(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type User = z.infer<typeof userSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
