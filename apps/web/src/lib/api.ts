import type {
  Bid,
  Document,
  DocumentVersion,
  CreateDocumentInput,
  UpdateDocumentInput,
  LicitacaoChecklistItem,
  CreateLicitacaoChecklistItemInput,
  UpdateLicitacaoChecklistItemInput,
} from "@licitafacil/shared";
import { getAuthHeaders, getToken } from "./auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * TODO: Trocar por API real quando autenticação estiver implementada.
 * Por enquanto, retorna mock data para não travar a UI.
 */
async function fetchBidMock(id: string): Promise<Bid> {
  // Simula delay de rede
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Mock data baseado no schema
  const mockBid = {
    id,
    empresaId: "00000000-0000-0000-0000-000000000000",
    title: "Licitação de Serviços de TI",
    agency: "Prefeitura Municipal de São Paulo",
    modality: "PREGAO_ELETRONICO",
    legalStatus: "PARTICIPANDO",
    operationalState: "EM_RISCO",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Bid;

  return mockBid;
}

/**
 * Busca uma licitação por ID
 *
 * TODO: Implementar autenticação e headers quando F1-02 estiver concluída.
 * Por enquanto, tenta a API real e cai para mock apenas em desenvolvimento se falhar.
 */
export async function fetchBid(id: string): Promise<Bid> {
  const useMocks = process.env.NODE_ENV === "development" ||
                   process.env.NEXT_PUBLIC_USE_MOCKS === "true";

  try {
    // Tenta buscar da API real
    const response = await fetch(`${API_BASE_URL}/bids/${id}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    }

    // Se não encontrou ou erro, usa mock apenas em dev
    if (useMocks) {
      console.warn(`API retornou ${response.status}, usando mock data (dev mode)`);
      return fetchBidMock(id);
    }

    // Em produção, lança erro se API falhar
    throw new Error(`API retornou ${response.status}: ${response.statusText}`);
  } catch (error) {
    // Se erro de rede, usa mock apenas em dev
    if (useMocks) {
      console.warn("Erro ao buscar licitação da API, usando mock data (dev mode):", error);
      return fetchBidMock(id);
    }

    // Em produção, propaga o erro
    throw error;
  }
}

/**
 * Interface para resposta de listagem de documentos
 */
export interface DocumentsListResponse {
  data: Document[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Busca documentos com filtros e paginação
 */
export async function fetchDocuments(params?: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
}): Promise<DocumentsListResponse> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.limit) queryParams.append("limit", params.limit.toString());
  if (params?.category) queryParams.append("category", params.category);
  if (params?.search) queryParams.append("search", params.search);

  const url = `${API_BASE_URL}/documents${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store", // Sempre buscar dados atualizados
  });

  if (!response.ok) {
    throw new Error(`API retornou ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Busca um documento por ID
 */
export async function fetchDocument(id: string): Promise<Document> {
  const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API retornou ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Faz upload de um documento ou cria nova versão
 */
export async function uploadDocument(
  file: File,
  data: CreateDocumentInput,
  documentId?: string,
): Promise<Document> {
  const formData = new FormData();
  formData.append("file", file);
  if (documentId) {
    // Se documentId foi fornecido, criar nova versão (não precisa de name/category)
    formData.append("documentId", documentId);
  } else {
    // Se não, criar novo documento (precisa de name/category)
    formData.append("name", data.name);
    formData.append("category", data.category);
  }

  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  // Não definir Content-Type, o navegador vai definir automaticamente com o boundary correto

  const response = await fetch(`${API_BASE_URL}/documents`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `API retornou ${response.status}`);
  }

  return response.json();
}

/**
 * Atualiza um documento
 */
export async function updateDocument(
  id: string,
  data: UpdateDocumentInput,
): Promise<Document> {
  const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `API retornou ${response.status}`);
  }

  return response.json();
}

/**
 * Deleta um documento (soft delete)
 */
export async function deleteDocument(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `API retornou ${response.status}`);
  }
}

/**
 * Restaura um documento deletado
 */
export async function restoreDocument(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/documents/${id}/restore`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `API retornou ${response.status}`);
  }
}

/**
 * Faz download de um documento
 */
export async function downloadDocument(id: string, filename: string): Promise<void> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/documents/${id}/download`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new Error(`API retornou ${response.status}: ${response.statusText}`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Busca todas as versões de um documento
 */
export async function fetchDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/versions`, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API retornou ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Busca uma versão específica de um documento
 */
export async function fetchDocumentVersion(
  documentId: string,
  versionNumber: number,
): Promise<DocumentVersion> {
  const response = await fetch(
    `${API_BASE_URL}/documents/${documentId}/versions/${versionNumber}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`API retornou ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Restaura uma versão anterior de um documento
 */
export async function restoreDocumentVersion(
  documentId: string,
  versionNumber: number,
): Promise<Document> {
  const response = await fetch(
    `${API_BASE_URL}/documents/${documentId}/versions/${versionNumber}/restore`,
    {
      method: "POST",
      headers: getAuthHeaders(),
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `API retornou ${response.status}`);
  }

  return response.json();
}

/**
 * Busca todos os itens de checklist de uma licitação
 */
export async function fetchChecklistItems(licitacaoId: string): Promise<LicitacaoChecklistItem[]> {
  const response = await fetch(`${API_BASE_URL}/checklist-items/licitacao/${licitacaoId}`, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API retornou ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Cria um novo item de checklist
 */
export async function createChecklistItem(
  data: CreateLicitacaoChecklistItemInput,
): Promise<LicitacaoChecklistItem> {
  const response = await fetch(`${API_BASE_URL}/checklist-items`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `API retornou ${response.status}`);
  }

  return response.json();
}

/**
 * Marca um item de checklist como concluído
 */
export async function markChecklistItemCompleted(
  id: string,
  evidenciaId?: string | null,
): Promise<LicitacaoChecklistItem> {
  const response = await fetch(`${API_BASE_URL}/checklist-items/${id}/complete`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ evidenciaId: evidenciaId || null }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `API retornou ${response.status}`);
  }

  return response.json();
}

/**
 * Desmarca um item de checklist (marca como não concluído)
 */
export async function markChecklistItemIncomplete(
  id: string,
): Promise<LicitacaoChecklistItem> {
  const response = await fetch(`${API_BASE_URL}/checklist-items/${id}/incomplete`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `API retornou ${response.status}`);
  }

  return response.json();
}

/**
 * Atualiza um item de checklist
 */
export async function updateChecklistItem(
  id: string,
  data: UpdateLicitacaoChecklistItemInput,
): Promise<LicitacaoChecklistItem> {
  const response = await fetch(`${API_BASE_URL}/checklist-items/${id}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `API retornou ${response.status}`);
  }

  return response.json();
}
