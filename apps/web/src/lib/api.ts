import axios from "axios";
import { getToken, clearAuth } from "@/lib/auth";
import type { Document } from "@licitafacil/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const api = axios.create({
  baseURL: API_URL,
});

// Interceptor to add token to requests (usa o mesmo token do auth)
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Interceptor to handle unauthorized errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        clearAuth();
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

// --- Checklist (itens de checklist da licitação) ---
export async function fetchChecklistItems(licitacaoId: string) {
  const { data } = await api.get(`/checklist-items/licitacao/${licitacaoId}`);
  return data;
}

export async function markChecklistItemCompleted(itemId: string, evidenciaId?: string | null) {
  const { data } = await api.post(`/checklist-items/${itemId}/complete`, evidenciaId != null ? { evidenciaId } : {});
  return data;
}

export async function markChecklistItemIncomplete(itemId: string) {
  const { data } = await api.post(`/checklist-items/${itemId}/incomplete`);
  return data;
}

// --- Prazos (deadlines da licitação) ---
export async function fetchPrazosByBid(bidId: string) {
  const { data } = await api.get(`/prazos/bid/${bidId}`);
  return data;
}

/** Próximos prazos da empresa (dashboard), ordenados por data */
export async function fetchUpcomingPrazos(limit = 10): Promise<
  Array<{
    id: string;
    titulo: string;
    dataPrazo: string;
    bidId: string;
    bidTitle?: string | null;
    diasRestantes: number | null;
    isCritical?: boolean;
  }>
> {
  const { data } = await api.get("/prazos/upcoming", { params: { limit } });
  return data;
}

export async function fetchPrazo(id: string) {
  const { data } = await api.get(`/prazos/${id}`);
  return data;
}

export async function createPrazo(body: { bidId: string; titulo: string; dataPrazo: string; descricao?: string | null }) {
  const { data } = await api.post("/prazos", body);
  return data;
}

export async function updatePrazo(id: string, body: { titulo?: string; dataPrazo?: string; descricao?: string | null }) {
  const { data } = await api.patch(`/prazos/${id}`, body);
  return data;
}

export async function deletePrazo(id: string) {
  const { data } = await api.delete(`/prazos/${id}`);
  return data;
}

export interface EventoAgenda {
  id: string;
  data: string;
  tipo: "PRAZO" | "SESSAO" | "ABERTURA";
  titulo: string;
  bidId: string;
  bid: { numero: string; orgao: string };
  diasRestantes: number;
}

export async function getEventosAgenda(
  mes: string
): Promise<{ eventos: EventoAgenda[]; message?: string }> {
  const { data } = await api.get("/negocios/eventos", {
    params: { mes },
  });
  return data;
}

// --- Jurídico (petições) ---
export type TipoPeticao =
  | "IMPUGNACAO"
  | "ESCLARECIMENTO"
  | "INTENCAO_RECURSO"
  | "RECURSO"
  | "CONTRA_RAZAO";

export type StatusPeticao = "RASCUNHO" | "ENVIADO";

export interface Peticao {
  id: string;
  empresaId: string;
  bidId: string;
  tipo: TipoPeticao;
  conteudo: string | null;
  nomeArquivo: string | null;
  dataEnvio: string | null;
  status: StatusPeticao;
  createdAt: string;
  updatedAt: string;
}

export interface GerarPeticaoBody {
  bidId: string;
  tipo: TipoPeticao;
  conteudo: string;
  cnpj?: string;
  endereco?: string;
  cidade?: string;
}

export async function gerarPeticaoDocx(body: GerarPeticaoBody): Promise<{ blob: Blob; fileName: string }> {
  const response = await api.post("/juridico/peticoes/gerar", body, {
    responseType: "arraybuffer",
  });
  const blob = new Blob([response.data], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  const header = response.headers["content-disposition"] as string | undefined;
  const match = header?.match(/filename="([^"]+)"/);
  const fileName = match?.[1] || `peticao_${body.tipo}.docx`;

  return { blob, fileName };
}

export async function listarPeticoesByBid(bidId: string): Promise<Peticao[]> {
  const { data } = await api.get(`/juridico/peticoes/${bidId}`);
  return data;
}

export async function atualizarStatusPeticao(id: string, status: StatusPeticao): Promise<Peticao> {
  const { data } = await api.put(`/juridico/peticoes/${id}/status`, { status });
  return data;
}

// --- Disputa (simulador de lance) ---
export interface SimularLanceInput {
  valorInicial: number;
  percentualDesconto: number;
  numConcorrentes?: number;
  bidId?: string;
}

export interface SimulacaoResult {
  lanceSugerido: number;
  lanceMinimo: number;
  lanceAgressivo: number;
  economia: number;
  percentualEconomia: number;
}

export interface SimulacaoDisputa {
  id: string;
  empresaId: string;
  bidId: string | null;
  valorInicial: number;
  percentualDesconto: number;
  numConcorrentes: number;
  lanceSugerido: number;
  lanceMinimo: number;
  lanceAgressivo: number;
  createdAt: string;
}

export async function simularLance(dados: SimularLanceInput): Promise<SimulacaoResult> {
  const { data } = await api.post("/disputa/simular", dados);
  return data;
}

export async function getHistoricoSimulacoes(bidId: string): Promise<SimulacaoDisputa[]> {
  const { data } = await api.get(`/disputa/historico/${bidId}`);
  return data;
}

// --- Chat com Edital ---
export interface ChatResposta {
  resposta: string;
  pergunta: string;
  createdAt: string;
}

export interface ChatMensagem {
  id: string;
  pergunta: string;
  resposta: string;
  createdAt: string;
}

export async function chatComEdital(bidId: string, pergunta: string): Promise<ChatResposta> {
  const { data } = await api.post(`/bids/${bidId}/chat`, { pergunta });
  return data;
}

export async function getChatHistorico(bidId: string): Promise<ChatMensagem[]> {
  const { data } = await api.get(`/bids/${bidId}/chat/historico`);
  return data;
}

// --- Análise de Mercado (PNCP) ---
export interface HistoricoCompraItem {
  data: string;
  objeto: string;
  vencedor: string;
  valor: number;
  modalidade: string;
  numeroContrato: string;
}

export interface HistoricoComprasResponse {
  itens: HistoricoCompraItem[];
  porMes: { mes: string; valorTotal: number }[];
  mensagem?: string;
}

export interface ConcorrentesResponse {
  taxaSucesso: number;
  totalVencidas: number;
  valorTotalGanho: number;
  modalidades: { modalidade: string; quantidade: number }[];
  licitacoes: { data: string; objeto: string; orgao: string; valor: number }[];
  mensagem?: string;
}

export interface ProdutoAnaliseItem {
  produto: string;
  marca: string;
  vezesHomologado: number;
  precoMedio: number;
  precoMinimo: number;
  precoMaximo: number;
}

export interface ProdutosResponse {
  itens: ProdutoAnaliseItem[];
  mensagem?: string;
}

export async function getHistoricoCompras(
  cnpj: string,
  meses: number
): Promise<HistoricoComprasResponse> {
  const cnpjLimpo = cnpj.replace(/[./-]/g, "");
  const { data } = await api.get("/analise/historico-compras", {
    params: { cnpj: cnpjLimpo, meses },
    timeout: 90000,
  });
  return data;
}

export async function getConcorrentes(cnpj: string): Promise<ConcorrentesResponse> {
  const cnpjLimpo = cnpj.replace(/[./-]/g, "");
  const { data } = await api.get("/analise/concorrentes", {
    params: { cnpj: cnpjLimpo },
    timeout: 60000,
  });
  return data;
}

export async function getProdutos(categoria: string): Promise<ProdutosResponse> {
  const { data } = await api.get("/analise/produtos", {
    params: { categoria },
    timeout: 30000,
  });
  return data;
}

// --- Documentos ---
export interface FetchDocumentsParams {
  page?: number;
  limit?: number;
  bidId?: string;
  category?: string;
  search?: string;
  /** Filtro por validade: EXPIRING_SOON = documentos que vencem em até expiringDays */
  status?: "VALID" | "EXPIRING_SOON" | "EXPIRED" | "NO_EXPIRATION";
  /** Documentos expirando em até N dias (usado com status=EXPIRING_SOON) */
  expiringDays?: number;
}

export interface DocumentsResponse {
  data: Document[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export async function fetchDocuments(params: FetchDocumentsParams = {}): Promise<DocumentsResponse> {
  const { data } = await api.get<DocumentsResponse>("/documents", {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      bidId: params.bidId,
      category: params.category || undefined,
      search: params.search || undefined,
      status: params.status,
      expiringDays: params.expiringDays,
    },
  });
  return data;
}

/** Faz download do arquivo e dispara o save no navegador */
export async function downloadDocument(documentId: string, fileName: string): Promise<void> {
  const { data } = await api.get(`/documents/${documentId}/download`, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName || "documento");
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function deleteDocument(id: string): Promise<void> {
  await api.delete(`/documents/${id}`);
}

export async function uploadDocument(
  file: File,
  body: { name: string; category: string; bidId?: string }
): Promise<Document> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("name", body.name);
  formData.append("category", body.category);
  if (body.bidId) {
    formData.append("bidId", body.bidId);
  }
  const { data } = await api.post("/documents", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function fetchDocumentVersions(documentId: string) {
  const { data } = await api.get(`/documents/${documentId}/versions`);
  return data;
}

export async function restoreDocumentVersion(documentId: string, versionNumber: number) {
  const { data } = await api.post(`/documents/${documentId}/versions/${versionNumber}/restore`);
  return data;
}

// --- Alerts ---
export async function fetchAlerts(params: { page?: number; limit?: number; status?: string; severity?: string; type?: string } = {}) {
  const { data } = await api.get("/alerts", {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      status: params.status,
      severity: params.severity,
      type: params.type,
    },
  });
  return data;
}

export async function createAlert(body: { title: string; message: string; type?: string; severity?: string; resourceType?: string; resourceId?: string; metadata?: Record<string, unknown> }) {
  const { data } = await api.post("/alerts", body);
  return data;
}

export async function markAlertSeen(id: string) {
  const { data } = await api.post(`/alerts/${id}/mark-seen`);
  return data;
}

export async function markAlertResolved(id: string) {
  const { data } = await api.post(`/alerts/${id}/mark-resolved`);
  return data;
}
