import { notFound } from "next/navigation";
import { fetchBid } from "@/lib/api";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Section, SectionItem } from "@/components/ui/Section";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Função auxiliar para formatar modalidade
function formatModality(modality: string): string {
  const modalityMap: Record<string, string> = {
    PREGAO_ELETRONICO: "Pregão Eletrônico",
    CONCORRENCIA: "Concorrência",
    DISPENSA: "Dispensa",
    OUTRA: "Outra",
  };
  return modalityMap[modality] || modality;
}

// Função auxiliar para formatar status jurídico
function formatLegalStatus(status: string): string {
  const statusMap: Record<string, string> = {
    ANALISANDO: "Analisando",
    PARTICIPANDO: "Participando",
    DESCARTADA: "Descartada",
    VENCIDA: "Vencida",
    PERDIDA: "Perdida",
    CANCELADA: "Cancelada",
  };
  return statusMap[status] || status;
}

// Função auxiliar para formatar estado operacional
function formatOperationalState(state: string): string {
  const stateMap: Record<string, string> = {
    OK: "OK",
    EM_RISCO: "Em Risco",
  };
  return stateMap[state] || state;
}

// Função para obter cor do badge de status jurídico
function getLegalStatusVariant(status: string): "default" | "success" | "warning" | "danger" | "info" {
  const variantMap: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
    ANALISANDO: "info",
    PARTICIPANDO: "success",
    DESCARTADA: "default",
    VENCIDA: "success",
    PERDIDA: "danger",
    CANCELADA: "warning",
  };
  return variantMap[status] || "default";
}

// Função para obter cor do badge de estado operacional
function getOperationalStateVariant(
  state: string,
): "default" | "success" | "warning" | "danger" | "info" {
  return state === "EM_RISCO" ? "warning" : "success";
}

export default async function LicitacaoDetailPage({ params }: PageProps) {
  const { id } = await params;

  let bid;
  try {
    bid = await fetchBid(id);
  } catch (error) {
    console.error("Erro ao buscar licitação:", error);
    notFound();
  }

  if (!bid) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mb-4 inline-block"
          >
            ← Voltar
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {bid.title}
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">{bid.agency}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={getLegalStatusVariant(bid.legalStatus)}>
                {formatLegalStatus(bid.legalStatus)}
              </Badge>
              <Badge variant={getOperationalStateVariant(bid.operationalState)}>
                {formatOperationalState(bid.operationalState)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Conteúdo principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dados Gerais */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Dados Gerais
                </h2>
              </CardHeader>
              <CardContent>
                <Section title="">
                  <div className="space-y-4">
                    <SectionItem label="Modalidade" value={formatModality(bid.modality)} />
                    <SectionItem label="Órgão" value={bid.agency} />
                    <SectionItem
                      label="Criado em"
                      value={new Date(bid.createdAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    />
                    <SectionItem
                      label="Atualizado em"
                      value={new Date(bid.updatedAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    />
                  </div>
                </Section>
              </CardContent>
            </Card>

            {/* Status Jurídico */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Status Jurídico
                </h2>
              </CardHeader>
              <CardContent>
                <Section title="">
                  <SectionItem
                    label="Status"
                    value={
                      <Badge variant={getLegalStatusVariant(bid.legalStatus)}>
                        {formatLegalStatus(bid.legalStatus)}
                      </Badge>
                    }
                  />
                </Section>
              </CardContent>
            </Card>

            {/* Estado Operacional */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Estado Operacional
                </h2>
              </CardHeader>
              <CardContent>
                <Section title="">
                  <SectionItem
                    label="Estado"
                    value={
                      <Badge variant={getOperationalStateVariant(bid.operationalState)}>
                        {formatOperationalState(bid.operationalState)}
                      </Badge>
                    }
                  />
                </Section>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Ações e Links */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Ações
                </h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* TODO: Implementar página de documentos quando F1-05 estiver concluída */}
                  <Link
                    href={`/licitacoes/${id}/documentos`}
                    className="block w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg transition-colors font-medium"
                  >
                    📄 Documentos
                  </Link>

                  {/* TODO: Implementar página de prazos quando F1-06 estiver concluída */}
                  <Link
                    href={`/licitacoes/${id}/prazos`}
                    className="block w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg transition-colors font-medium"
                  >
                    📅 Prazos
                  </Link>

                  {/* TODO: Implementar página de checklist quando F1-07 estiver concluída */}
                  <Link
                    href={`/licitacoes/${id}/checklist`}
                    className="block w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg transition-colors font-medium"
                  >
                    ✅ Checklist
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
