import type { AuthResponse, User } from "@licitafacil/shared";

const TOKEN_KEY = "licitafacil_token";
const USER_KEY = "licitafacil_user";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * Armazena token e usuário no localStorage
 */
export function setAuth(token: string, user: User): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

/**
 * Obtém o token armazenado
 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Obtém o usuário armazenado
 */
export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr) as User;
  } catch {
    return null;
  }
}

/**
 * Remove autenticação (logout)
 */
export function clearAuth(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

/**
 * Verifica se o usuário está autenticado
 */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}

/**
 * Obtém headers com autenticação para requisições
 * 
 * Em desenvolvimento, se não houver token, usa headers DEV para bypass
 * (requer AUTH_DEV_BYPASS=true na API e variáveis NEXT_PUBLIC_DEV_USER_ID e NEXT_PUBLIC_DEV_EMPRESA_ID)
 * 
 * IMPORTANTE: Esta função só deve ser chamada no cliente (em componentes client-side ou funções de fetch)
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else if (typeof window !== "undefined") {
    // Em DEV, se não houver token, usar bypass DEV
    // Usar apenas NEXT_PUBLIC_USE_DEV_BYPASS para evitar problemas de hidratação
    const useDevBypass = process.env.NEXT_PUBLIC_USE_DEV_BYPASS === "true";
    
    if (useDevBypass) {
      const devUserId = process.env.NEXT_PUBLIC_DEV_USER_ID;
      const devEmpresaId = process.env.NEXT_PUBLIC_DEV_EMPRESA_ID;

      if (devUserId && devEmpresaId) {
        headers["x-dev-user-id"] = devUserId;
        headers["x-dev-empresa-id"] = devEmpresaId;
      }
    }
  }

  return headers;
}

/**
 * Faz login na API
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Erro ao fazer login: ${response.status}`);
  }

  const data: AuthResponse = await response.json();
  setAuth(data.accessToken, data.user);
  return data;
}

/**
 * Faz logout
 */
export function logout(): void {
  clearAuth();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}
