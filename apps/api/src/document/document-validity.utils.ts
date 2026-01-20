/**
 * Funções puras de domínio para cálculo de validade de documentos
 *
 * Timezone: Todas as comparações usam UTC para consistência
 * Janela de expiração: Configurável via env, default 30 dias
 */

import { DocumentValidityStatus } from "@licitafacil/shared";

/**
 * Interface para dados de validade de documento
 */
export interface DocumentValidityData {
  doesExpire: boolean;
  issuedAt: Date | null;
  expiresAt: Date | null;
}

/**
 * Janela de expiração em dias (default: 30 dias)
 * Pode ser configurada via variável de ambiente DOCUMENT_EXPIRING_SOON_DAYS
 * Fallback seguro: 30 dias se não configurado
 */
export const EXPIRING_SOON_DAYS = parseInt(
  process.env.DOCUMENT_EXPIRING_SOON_DAYS || "30",
  10,
) || 30; // Fallback seguro para 30 dias

/**
 * Obtém a data/hora atual em UTC
 *
 * DECISÃO TÉCNICA: Backend opera exclusivamente em UTC
 * - Todas as comparações de validade usam UTC
 * - expiresAt armazenado no banco em UTC (PostgreSQL TIMESTAMP)
 * - Documento é considerado vencido quando: expiresAt <= getNowUTC()
 *
 * Garante consistência de timezone em todas as comparações
 */
export function getNowUTC(): Date {
  // new Date() retorna data/hora atual em UTC quando usado sem parâmetros
  // JavaScript Date sempre trabalha internamente em UTC
  return new Date();
}

/**
 * Calcula o número de dias até o vencimento
 *
 * @param now - Data/hora atual (UTC)
 * @param expiresAt - Data de vencimento (pode ser null)
 * @returns Número de dias até vencimento, ou null se não expira ou já expirou
 */
export function daysToExpire(now: Date, expiresAt: Date | null): number | null {
  if (!expiresAt) {
    return null;
  }

  const diffMs = expiresAt.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // Se já expirou, retorna null (não faz sentido retornar negativo)
  if (diffDays < 0) {
    return null;
  }

  return diffDays;
}

/**
 * Calcula o status de validade do documento
 *
 * REGRAS DE NEGÓCIO:
 * - NO_EXPIRATION: doesExpire=false (documento não tem validade)
 * - EXPIRED: expiresAt <= now (documento vencido)
 * - EXPIRING_SOON: expiresAt está dentro da janela configurada (EXPIRING_SOON_DAYS)
 * - VALID: expiresAt está no futuro, fora da janela de expiração
 *
 * DEFINIÇÃO DE VENCIDO:
 * Um documento é considerado vencido quando expiresAt <= getNowUTC()
 * Comparação feita em UTC para evitar problemas de timezone.
 *
 * FAIL-SAFE:
 * Se houver dados incompletos ou inconsistentes, retorna status mais seguro
 * (tende a marcar como "em risco" ao invés de "OK" silencioso)
 *
 * @param now - Data/hora atual (UTC) - usar getNowUTC()
 * @param doc - Dados de validade do documento
 * @returns Status de validade calculado
 */
export function computeDocumentValidityStatus(
  now: Date,
  doc: DocumentValidityData,
): typeof DocumentValidityStatus[keyof typeof DocumentValidityStatus] {
  // Se não expira, status é NO_EXPIRATION
  if (!doc.doesExpire) {
    return DocumentValidityStatus.NO_EXPIRATION;
  }

  // Fail-safe: Se doesExpire=true mas expiresAt é null, trata como EXPIRED
  // (dados inconsistentes - melhor ser conservador)
  if (!doc.expiresAt) {
    return DocumentValidityStatus.EXPIRED;
  }

  // Calcula dias até vencimento
  const days = daysToExpire(now, doc.expiresAt);

  // Se já expirou (days é null ou negativo)
  if (days === null) {
    return DocumentValidityStatus.EXPIRED;
  }

  // Se está dentro da janela de expiração
  if (days <= EXPIRING_SOON_DAYS) {
    return DocumentValidityStatus.EXPIRING_SOON;
  }

  // Caso contrário, está válido
  return DocumentValidityStatus.VALID;
}
