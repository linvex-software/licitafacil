import axios from "axios";
import { getToken, clearAuth } from "@/lib/auth";
import type { Document } from "@licitafacil/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const api = axios.create({
  baseURL: API_URL,
});

/** Erro de 403 de billing já tratado pelo modal global (evita toast / tela de erro). */
export function isBillingHandledError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  return Boolean((error as { _billingHandled?: boolean })._billingHandled);
}

// Callback registrável para o BillingProvider reagir a 403 estruturados
type BillingErrorHandler = (error: {
  code: string;
  currentPlan?: string;
  requiredPlan?: string;
  feature?: string;
  currentCount?: number;
  maxAllowed?: number;
  suggestedPlan?: string;
  status?: string;
}) => void;

let billingErrorHandler: BillingErrorHandler | null = null;

export function registerBillingErrorHandler(handler: BillingErrorHandler) {
  billingErrorHandler = handler;
}

export function unregisterBillingErrorHandler() {
  billingErrorHandler = null;
}

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

// Interceptor: 403 de billing (antes do 401) e não autorizado
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 && error.response?.data?.code) {
      const data = error.response.data as { code?: string };
      const code = data.code;
      if (
        billingErrorHandler &&
        (code === "FEATURE_LOCKED" ||
          code === "USER_LIMIT_EXCEEDED" ||
          code === "ACCOUNT_INACTIVE")
      ) {
        billingErrorHandler(data as Parameters<BillingErrorHandler>[0]);
        (error as { _billingHandled?: boolean })._billingHandled = true;
        return Promise.reject(error);
      }
    }

    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        clearAuth();
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  },
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

export type PortalDisputa = "COMPRASNET" | "BNC";
export type EstrategiaDisputa = "AGRESSIVA" | "CONSERVADORA" | "POR_MARGEM";
export type DisputaStatus =
  | "AGENDADA"
  | "INICIANDO"
  | "AO_VIVO"
  | "PAUSADA"
  | "ENCERRADA"
  | "CANCELADA"
  | "ERRO";

export interface DisputaConfiguracao {
  id: string;
  itemNumero: number;
  itemDescricao?: string | null;
  valorMaximo: number;
  valorMinimo: number;
  estrategia: EstrategiaDisputa;
  ativo: boolean;
  melhorLance?: number | null;
  posicaoAtual?: number | null;
  statusItem?: "AGUARDANDO" | "ABERTO" | "ENCERRAMENTO_ALEATORIO" | "ENCERRADO";
  vencedor?: string | null;
  valorFinal?: number | null;
}

export interface DisputaCredencialPublica {
  id: string;
  cnpj: string;
  portal: PortalDisputa;
}

export interface DisputaBidResumo {
  id: string;
  title: string;
  agency: string;
  pregoesMonitorados?: Array<{
    urlSalaDisputa: string;
    linkPncp?: string | null;
  }>;
}

export interface Disputa {
  id: string;
  bidId: string | null;
  bid?: DisputaBidResumo | null;
  portal: PortalDisputa;
  status: DisputaStatus;
  agendadoPara?: string | null;
  iniciadoEm?: string | null;
  encerradoEm?: string | null;
  numeroPregao?: string;
  uasg?: string;
  credencial: DisputaCredencialPublica | null;
  configuracoes: DisputaConfiguracao[];
  historico?: Array<{
    id: string;
    itemNumero: number;
    evento: string;
    valorEnviado?: number | null;
    melhorLance?: number | null;
    posicao?: number | null;
    detalhe?: string | null;
    origem?: "MANUAL" | "EXTENSAO";
    timestamp: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CriarDisputaInput {
  bidId?: string;
  licitacaoId?: string;
  numeroPregao?: string;
  uasg?: string;
  portal: PortalDisputa;
  agendadoPara?: string;
  credencial?: {
    cnpj: string;
    senha: string;
  };
  configuracoes?: Array<{
    itemNumero: number;
    itemDescricao?: string;
    valorMaximo: number;
    valorMinimo: number;
    estrategia: EstrategiaDisputa;
    ativo?: boolean;
  }>;
}

export interface LicitacaoResumo {
  id: string;
  title: string;
  agency: string;
}

export async function buscarLicitacoes(): Promise<LicitacaoResumo[]> {
  const { data } = await api.get("/bids", { params: { page: 1, limit: 100 } });
  return data?.data ?? [];
}

export async function listarDisputas(): Promise<Disputa[]> {
  const { data } = await api.get("/disputa");
  return data;
}

export async function buscarDisputa(id: string): Promise<Disputa> {
  const { data } = await api.get(`/disputa/${id}`);
  return data;
}

export async function criarDisputa(payload: CriarDisputaInput): Promise<Disputa> {
  const { data } = await api.post("/disputa", payload);
  return data;
}

export async function pausarDisputa(id: string) {
  const { data } = await api.patch(`/disputa/${id}/pausar`);
  return data;
}

export async function retomarDisputa(id: string) {
  const { data } = await api.patch(`/disputa/${id}/retomar`);
  return data;
}

export async function encerrarDisputa(id: string, detalhe?: string) {
  const { data } = await api.patch(`/disputa/${id}/encerrar`, { detalhe });
  return data;
}

export async function cancelarDisputa(id: string) {
  const { data } = await api.delete(`/disputa/${id}`);
  return data;
}

export async function enviarLanceManual(
  id: string,
  payload: { itemNumero: number; valor: number },
) {
  const { data } = await api.patch(`/disputa/${id}/lance-manual`, payload);
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
  escopoImpugnacao: "TOTAL" | "PARCIAL" | null;
  efeitoRecurso: "SUSPENSIVO" | "DEVOLUTIVO" | "NAO_APLICA";
  anonimo: boolean;
  autorTipo: "CONCORRENTE" | "CIDADAO" | "ORGAO";
  motivoIntencao: string | null;
  itensContestados: string | null;
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
  nomeEmpresa?: string;
  cnpj?: string;
  endereco?: string;
  cidade?: string;
  escopoImpugnacao?: "TOTAL" | "PARCIAL";
  efeitoRecurso?: "SUSPENSIVO" | "DEVOLUTIVO" | "NAO_APLICA";
  anonimo?: boolean;
  autorTipo?: "CONCORRENTE" | "CIDADAO" | "ORGAO";
  motivoIntencao?: string;
  itensContestados?: string[];
}

export interface EventoLicitacao {
  id: string;
  tipo: string;
  timestamp: string;
  detalhes?: Record<string, unknown> | null;
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

export async function listarEventosLicitacao(bidId: string): Promise<EventoLicitacao[]> {
  const { data } = await api.get(`/bids/${bidId}/eventos`);
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

export interface FatorAnalise {
  nome: string;
  descricao: string;
  peso: number;
  score: number;
  scoreContribuicao: number;
  detalhe: string;
  dados?: Record<string, any>;
}

export interface BidPrediction {
  id: string;
  bidId: string;
  empresaId: string;
  score: number;
  recomendacao: "PARTICIPAR" | "ANALISAR" | "DESCARTAR";
  fatores: FatorAnalise[];
  explicacao: string;
  acoes: string[];
  tokensUsados?: number;
  tempoSegundos?: number;
  createdAt: string;
  updatedAt: string;
}

export async function obterProbabilidadeLicitacao(id: string): Promise<BidPrediction> {
  const { data } = await api.get(`/bids/${id}/probabilidade`);
  return data;
}

export async function importarDocumentosAnalise(bidId: string) {
  const { data } = await api.post(`/bids/${bidId}/importar-documentos-analise`);
  return data;
}

export async function gerarChecklistAnalise(bidId: string) {
  const { data } = await api.post(`/bids/${bidId}/gerar-checklist-analise`);
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
  body: { name: string; category: string; bidId?: string; documentId?: string },
  onProgress?: (progress: number) => void,
): Promise<Document> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("name", body.name);
  formData.append("category", body.category);
  if (body.bidId) {
    formData.append("bidId", body.bidId);
  }
  if (body.documentId) {
    formData.append("documentId", body.documentId);
  }
  const { data } = await api.post("/documents", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (event) => {
      if (!onProgress || !event.total) return;
      const progress = Math.round((event.loaded * 100) / event.total);
      onProgress(progress);
    },
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

// --- Monitoramento Multi-Portal ---
export async function listarPregoesPncp(data?: string): Promise<any[]> {
  const { data: res } = await api.get('/monitoramento/pregoes/pncp', { params: data ? { data } : {} })
  return Array.isArray(res) ? res : []
}

export async function listarPregoesMonitorados(filtros?: {
  data?: string
  portal?: string
  status?: string
  bidId?: string
}): Promise<any[]> {
  const { data: res } = await api.get('/monitoramento/pregoes', { params: filtros })
  return Array.isArray(res) ? res : []
}

export async function sugerirVinculoPregao(q: string): Promise<Array<{ id: string; title: string; agency: string }>> {
  const { data: res } = await api.get('/monitoramento/sugestoes-vinculo', { params: { q } })
  return Array.isArray(res) ? res : []
}

export async function cadastrarPregaoMonitorado(body: { url: string; bidId?: string | null; numeroPregao?: string }): Promise<any> {
  const { data: res } = await api.post('/monitoramento/pregoes', body)
  return res
}

export async function removerPregaoMonitorado(id: string): Promise<any> {
  const { data: res } = await api.delete(`/monitoramento/pregoes/${id}`)
  return res
}

export async function vincularPregaoMonitorado(pregaoId: string, bidId: string): Promise<any> {
  const { data: res } = await api.patch(`/monitoramento/pregoes/${pregaoId}`, { bidId })
  return res
}

export type ResultadoPregao = "GANHOU" | "PERDEU" | "DESISTIU" | "PENDENTE"
export type FonteValorReferenciaPregao = "PNCP" | "EDITAL" | "MANUAL"

export interface PregaoCentralItem {
  id: string
  bidId?: string | null
  bid?: { id: string; title?: string | null; agency?: string | null } | null
  portal: string
  status: string
  numeroPregao: string
  objeto: string
  orgao?: string | null
  horarioInicio: string
  urlSalaDisputa: string
  melhorLance?: number | null
  resultado?: ResultadoPregao
  valorFinal?: number | null
  valorReferencia?: number | null
  fonteValorReferencia?: FonteValorReferenciaPregao | null
  observacao?: string | null
  finalizadoEm?: string | null
}

export async function listarResultadosPregoes(params?: {
  portal?: string
  resultado?: ResultadoPregao
  periodoPor?: "INICIO" | "FINALIZACAO"
  dataInicio?: string
  dataFim?: string
  licitacao?: string
  page?: number
  limit?: number
}): Promise<{ page: number; limit: number; total: number; items: PregaoCentralItem[] }> {
  const { data } = await api.get("/monitoramento/pregoes/resultados", { params })
  return data
}

export async function metricasPregoes(params?: {
  portal?: string
  resultado?: ResultadoPregao
  periodoPor?: "INICIO" | "FINALIZACAO"
  dataInicio?: string
  dataFim?: string
  licitacao?: string
}): Promise<{
  total: number
  totalFinalizados: number
  totalComValorReferencia: number
  porResultado: Record<string, number>
  economiaTotal: number
  baseEconomia: { totalComValores: number; somaValorReferencia: number; somaValorFinal: number }
}> {
  const { data } = await api.get("/monitoramento/pregoes/metricas", { params })
  return data
}

export async function registrarResultadoPregao(
  pregaoId: string,
  body: {
    resultado: ResultadoPregao
    valorFinal?: number | null
    valorReferencia?: number | null
    fonteValorReferencia?: FonteValorReferenciaPregao | null
    observacao?: string | null
  },
): Promise<any> {
  const { data } = await api.patch(`/monitoramento/pregoes/${pregaoId}/resultado`, body)
  return data
}

export async function exportarResultadosPregoesCsv(params?: {
  portal?: string
  resultado?: ResultadoPregao
  periodoPor?: "INICIO" | "FINALIZACAO"
  dataInicio?: string
  dataFim?: string
  licitacao?: string
}): Promise<{ blob: Blob; fileName: string }> {
  const response = await api.get("/monitoramento/pregoes/exportar-csv", {
    params,
    responseType: "blob",
  })

  const header = response.headers["content-disposition"] as string | undefined
  const match = header?.match(/filename="([^"]+)"/)
  const fileName = match?.[1] || `pregoes_${new Date().toISOString().slice(0, 10)}.csv`
  const blob = new Blob([response.data], { type: "text/csv;charset=utf-8" })
  return { blob, fileName }
}


// --- Checklist Items (Adicional) ---
export async function updateChecklistItem(id: string, body: { titulo?: string; descricao?: string; exigeEvidencia?: boolean }) {
  const { data } = await api.patch(`/checklist-items/${id}`, body);
  return data;
}

export async function deleteChecklistItem(id: string): Promise<void> {
  await api.delete(`/checklist-items/${id}`);
}

// --- Config alertas pregão ---
export async function getConfigAlertaPregao(): Promise<{ minutosAlertaPregao: number }> {
  const { data } = await api.get('/empresas/configuracoes/alertas');
  return data;
}

export async function saveConfigAlertaPregao(minutos: number): Promise<void> {
  await api.patch('/empresas/configuracoes/alertas', { minutosAlertaPregao: minutos });
}
