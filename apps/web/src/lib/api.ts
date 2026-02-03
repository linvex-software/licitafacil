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

// --- Planos e uso do plano (F8-02) ---
export interface Plano {
  id: string;
  nome: string;
  tipo: string;
  maxEmpresas: number;
  maxUsuarios: number;
  precoMensal: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UsoPlano {
  usuariosAtivos: number;
  limiteUsuarios: number;
  podeAdicionarUsuario: boolean;
  plano: { id: string; nome: string; tipo: string; maxUsuarios: number };
  usuariosExtrasContratados: number;
}

export async function fetchPlanos(): Promise<Plano[]> {
  const { data } = await api.get<Plano[]>("/planos");
  return data;
}

export async function fetchUsoPlano(): Promise<UsoPlano> {
  const { data } = await api.get<UsoPlano>("/planos/uso");
  return data;
}

export async function updateEmpresaPlano(body: {
  planoId?: string;
  usuariosExtrasContratados?: number;
}) {
  const { data } = await api.patch("/empresas/me", body);
  return data;
}

// --- Usuários ---
export interface UserApi {
  id: string;
  email: string;
  name: string;
  role: string;
  empresaId: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchUsers(): Promise<UserApi[]> {
  const { data } = await api.get<UserApi[]>("/users");
  return data;
}

/** Cria usuário (admin) via register; empresaId deve ser da empresa do usuário logado. */
export async function createUser(body: {
  email: string;
  name: string;
  password: string;
  empresaId: string;
  role?: string;
}) {
  const { data } = await api.post("/auth/register", body);
  return data;
}
