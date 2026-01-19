import type { Bid } from "@licitafacil/shared";

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
      headers: {
        "Content-Type": "application/json",
        // TODO: Adicionar Authorization header quando autenticação estiver pronta
      },
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
