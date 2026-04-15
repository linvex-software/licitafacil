/**
 * Mensagens técnicas / de configuração que não devem aparecer para o comprador no checkout.
 */
const MENSAGEM_GENERICA =
  "Não foi possível concluir o pagamento agora. Tente de novo em alguns minutos ou use outro método. Se precisar de ajuda, fale com o suporte.";

const PADROES_INTERNO = [
  "não pertence a este ambiente",
  "does not belong to this environment",
  "asaas_api_key",
  "não configurada",
  "chave de api",
  "api key informada",
  "access_token",
  "invalid access token",
  "token inválido",
  "erro na api asaas",
  "sandbox",
  "internal server",
];

export function mensagemCheckoutParaCliente(mensagemInterna: string): string {
  const t = mensagemInterna.trim();
  if (!t) return MENSAGEM_GENERICA;
  const lower = t.toLowerCase();
  if (PADROES_INTERNO.some((p) => lower.includes(p))) {
    return MENSAGEM_GENERICA;
  }
  if (t.length > 320) {
    return `${t.slice(0, 320)}…`;
  }
  return t;
}
