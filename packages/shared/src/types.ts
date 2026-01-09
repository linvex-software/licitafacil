/**
 * Tipos utilitários e genéricos compartilhados
 *
 * Nota: Tipos Tenant e Bid são exportados diretamente dos schemas
 */

/**
 * Tipo genérico para respostas de API
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Tipo para paginação
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Tipo para ordenação
 */
export interface SortOptions {
  field: string;
  order: "asc" | "desc";
}

/**
 * Tipo para filtros genéricos
 */
export interface FilterOptions {
  [key: string]: string | number | boolean | undefined;
}

