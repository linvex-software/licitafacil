"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { importarDocumentosAnalise } from "@/lib/api";
import { toast } from "sonner";
import { UploadPdfDropzone } from "./upload-pdf-dropzone";
import {
  useAnalisarEdital,
  type AnalisarEditalResponse,
} from "@/hooks/use-analisar-edital";
import {
  Sparkles,
  Loader2,
  FileText,
  Calendar,
  CheckSquare,
} from "lucide-react";

interface AnalisarEditalModalProps {
  bidId: string;
  onAplicar: (resultado: AnalisarEditalResponse) => void;
}

export function AnalisarEditalModal({
  bidId,
  onAplicar,
}: AnalisarEditalModalProps) {
  const [open, setOpen] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<AnalisarEditalResponse | null>(
    null,
  );

  const { mutate: analisar, isPending } = useAnalisarEdital();

  function handleAnalisar() {
    if (!arquivo) return;

    analisar(
      { bidId, pdf: arquivo },
      {
        onSuccess: (data: AnalisarEditalResponse) => {
          setResultado(data);
        },
      },
    );
  }

  async function handleAplicar() {
    if (resultado) {
      try {
        // Gatilho para o backend importar os documentos pendentes
        await importarDocumentosAnalise(bidId);
        toast.success("Documentos pendentes identificados com sucesso.");
      } catch (error) {
        console.error("Erro ao importar documentos da análise", error);
        toast.error("Ocorreu um erro ao importar documentos exigidos.");
      }

      onAplicar(resultado);
      setOpen(false);
      setArquivo(null);
      setResultado(null);
    }
  }

  function handleDescartar() {
    setOpen(false);
    setArquivo(null);
    setResultado(null);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="w-4 h-4" />
          Analisar Edital (IA)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Análise Automática de Edital com IA
          </DialogTitle>
        </DialogHeader>

        {!resultado ? (
          <div className="space-y-6">
            <UploadPdfDropzone
              onFileSelect={setArquivo}
              disabled={isPending}
            />

            {isPending && (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-500" />
                <p className="text-lg font-medium mb-2">
                  Processando edital...
                </p>
                <p className="text-sm text-slate-500">
                  Isso pode levar até 60 segundos
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleAnalisar}
                disabled={!arquivo || isPending}
                className="flex-1"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analisar com IA
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleDescartar}
                disabled={isPending}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <Tabs defaultValue="geral">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="geral">
                  <FileText className="w-4 h-4 mr-2" />
                  Dados Gerais
                </TabsTrigger>
                <TabsTrigger value="prazos">
                  <Calendar className="w-4 h-4 mr-2" />
                  Prazos ({resultado.prazos?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="documentos">
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Documentos ({resultado.documentos?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="geral" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Modalidade
                    </label>
                    <p className="mt-1 text-lg">
                      {resultado.modalidade?.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Número do Edital
                    </label>
                    <p className="mt-1 text-lg">{resultado.numero || "-"}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Objeto
                  </label>
                  <p className="mt-1">{resultado.objeto}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Valor Estimado
                  </label>
                  <p className="mt-1 text-lg font-semibold text-emerald-600">
                    {resultado.valorEstimado
                      ? `R$ ${resultado.valorEstimado.toLocaleString("pt-BR")}`
                      : "Não informado"}
                  </p>
                </div>

                {resultado.tempoSegundos && (
                  <div className="text-sm text-slate-500 mt-4 pt-4 border-t">
                    Processado em {resultado.tempoSegundos}s
                    {resultado.tokensUsados &&
                      ` • ${resultado.tokensUsados} tokens`}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="prazos">
                <div className="space-y-3">
                  {resultado.prazos?.length > 0 ? (
                    resultado.prazos.map((prazo: any, idx: number) => (
                      <div
                        key={idx}
                        className="border rounded-lg p-4 hover:bg-slate-50"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{prazo.tipo}</h4>
                          <span className="text-sm font-medium text-blue-600">
                            {prazo.data
                              ? new Date(
                                prazo.data + "T00:00:00",
                              ).toLocaleDateString("pt-BR")
                              : "-"}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">
                          {prazo.descricao}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-slate-500 py-8">
                      Nenhum prazo identificado
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="documentos">
                <div className="space-y-2">
                  {resultado.documentos?.length > 0 ? (
                    resultado.documentos.map((doc: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 border rounded-lg p-3 hover:bg-slate-50"
                      >
                        <CheckSquare
                          className={`w-5 h-5 ${doc.obrigatorio
                            ? "text-red-500"
                            : "text-slate-400"
                            }`}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{doc.nome}</p>
                          <p className="text-xs text-slate-500">
                            {doc.obrigatorio ? "Obrigatório" : "Opcional"}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-slate-500 py-8">
                      Nenhum documento identificado
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={handleAplicar} className="flex-1">
                Aplicar Dados
              </Button>
              <Button variant="outline" onClick={handleDescartar}>
                Descartar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
