"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { type Document, DocumentCategory } from "@licitafacil/shared";
import { api, deleteDocument, fetchDocuments, uploadDocument } from "@/lib/api";
import { getFileUrl } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ExternalLink,
  FolderOpen,
  MoreHorizontal,
  Search,
  Upload,
} from "lucide-react";

type Categoria = typeof DocumentCategory[keyof typeof DocumentCategory];

interface BidLite {
  id: string;
  title: string;
}

interface UploadModalState {
  open: boolean;
  documentId?: string;
  defaultName?: string;
  defaultCategory?: Categoria;
  defaultBidId?: string | null;
}

const categoryLabels: Record<string, string> = {
  CONTRATOS: "Contratos",
  CERTIFICADOS: "Certificados",
  CERTIDOES: "Certidões",
  LICENCAS: "Licenças",
  PROPOSTAS: "Propostas",
  HABILITACAO: "Habilitação",
  COMPROVANTES: "Comprovantes",
  FINANCEIRO: "Financeiro",
  ADMINISTRATIVO: "Administrativo",
  OUTROS: "Outros",
};

/**
 * PASSO 1 — Mapeamento atual dos dados:
 * 1) Model Prisma `Document`:
 *    - `bidId` é opcional (documento pode ser global da empresa ou vinculado a licitação)
 *    - `empresaId` é obrigatório (isolamento multi-tenant)
 *    - `status` aceita `PENDENTE` | `ATIVO`
 *    - arquivo: `filename`, `mimeType`, `size`, `url` (+ versão em `DocumentVersion`)
 * 2) Endpoint de upload:
 *    - `POST /documents` recebe multipart
 *    - `bidId` já é opcional no backend
 *    - para nova versão pode enviar `documentId`
 */
export function CompanyDocumentsPageClient() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadState, setUploadState] = useState<UploadModalState>({ open: false });

  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<Categoria>(DocumentCategory.OUTROS);
  const [linkToBid, setLinkToBid] = useState(false);
  const [selectedBidId, setSelectedBidId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: docsResponse, isLoading } = useQuery({
    queryKey: ["company-documents", search, category],
    queryFn: () =>
      fetchDocuments({
        page: 1,
        limit: 200,
        search: search || undefined,
        category: category || undefined,
      }),
  });

  const { data: bids = [] } = useQuery({
    queryKey: ["company-documents-bids"],
    queryFn: async () => {
      const { data } = await api.get("/bids", { params: { page: 1, limit: 200 } });
      return (data?.data || []) as BidLite[];
    },
  });

  const docs = docsResponse?.data || [];
  const bidsById = useMemo(
    () => new Map(bids.map((bid) => [bid.id, bid.title])),
    [bids],
  );

  const globalDocs = docs.filter((doc) => !doc.bidId);
  const bidDocs = docs.filter((doc) => !!doc.bidId);
  const groupedByBid = bidDocs.reduce<Record<string, Document[]>>((acc, doc) => {
    const key = doc.bidId as string;
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {});

  const openUploadModal = (opts?: Omit<UploadModalState, "open">) => {
    setUploadState({ open: true, ...opts });
    setFormName(opts?.defaultName || "");
    setFormCategory(opts?.defaultCategory || DocumentCategory.OUTROS);
    setLinkToBid(Boolean(opts?.defaultBidId));
    setSelectedBidId(opts?.defaultBidId || "");
    setSelectedFile(null);
    setUploadProgress(0);
  };

  const closeUploadModal = () => {
    if (uploading) return;
    setUploadState({ open: false });
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("Selecione um arquivo.");
      if (!formName.trim()) throw new Error("Informe o nome do documento.");

      const bidId = linkToBid ? selectedBidId || undefined : undefined;
      if (linkToBid && !bidId) throw new Error("Selecione a licitação para vincular o documento.");

      setUploading(true);
      setUploadProgress(0);
      return uploadDocument(
        selectedFile,
        {
          name: formName.trim(),
          category: formCategory,
          bidId,
          documentId: uploadState.documentId,
        },
        setUploadProgress,
      );
    },
    onSuccess: () => {
      toast({ title: "Documento salvo", description: "Upload concluído com sucesso." });
      setUploading(false);
      setUploadState({ open: false });
      queryClient.invalidateQueries({ queryKey: ["company-documents"] });
    },
    onError: (error: any) => {
      setUploading(false);
      toast({
        title: "Erro no upload",
        description: error?.response?.data?.message || error?.message || "Não foi possível enviar o documento.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteDocument(id),
    onSuccess: () => {
      toast({ title: "Documento excluído" });
      queryClient.invalidateQueries({ queryKey: ["company-documents"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir",
        description: error?.response?.data?.message || "Não foi possível excluir o documento.",
        variant: "destructive",
      });
    },
  });

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    setSelectedFile(file);
    if (!formName.trim()) {
      setFormName(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxSize: 10 * 1024 * 1024,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
  });

  const longDate = (date: string) =>
    new Intl.DateTimeFormat("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(date));

  const formatSize = (size: number) => {
    if (!size || size <= 0) return "Sem arquivo";
    if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    if (size >= 1024) return `${Math.round(size / 1024)} KB`;
    return `${size} B`;
  };

  const fileVisual = (mimeType: string) => {
    if (mimeType === "application/pdf") return "📄";
    if (
      mimeType === "application/msword" ||
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) return "📝";
    if (mimeType.startsWith("image/")) return "🖼️";
    return "📎";
  };

  const displayStatus = (doc: Document): "PENDENTE" | "ENVIADO" | "APROVADO" | "VENCIDO" => {
    if (doc.status === "PENDENTE" || doc.size === 0 || !getFileUrl(doc.url)) return "PENDENTE";
    if (doc.validityStatus === "EXPIRED") return "VENCIDO";
    if (doc.validityStatus === "VALID") return "APROVADO";
    return "ENVIADO";
  };

  const statusClasses: Record<ReturnType<typeof displayStatus>, string> = {
    PENDENTE: "bg-amber-100 text-amber-800 border-amber-200",
    ENVIADO: "bg-blue-100 text-blue-800 border-blue-200",
    APROVADO: "bg-emerald-100 text-emerald-800 border-emerald-200",
    VENCIDO: "bg-red-100 text-red-800 border-red-200",
  };

  const renderDocCard = (doc: Document) => {
    const status = displayStatus(doc);
    return (
      <Card key={doc.id} className="border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-900 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xl">{fileVisual(doc.mimeType)}</span>
                <h4 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{doc.name}</h4>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {categoryLabels[doc.category] || doc.category} · {formatSize(doc.size)} · {longDate(doc.createdAt)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Badge className={`border ${statusClasses[status]}`}>{status}</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  openUploadModal({
                    documentId: doc.status === "PENDENTE" ? doc.id : undefined,
                    defaultName: doc.name,
                    defaultCategory: doc.category as Categoria,
                    defaultBidId: doc.bidId,
                  })
                }
              >
                <Upload className="mr-1 h-3 w-3" />
                Upload
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const fileUrl = getFileUrl(doc.url);
                  if (!fileUrl) {
                    toast({
                      title: "Arquivo indisponível",
                      description: "Este documento ainda não possui arquivo enviado.",
                      variant: "destructive",
                    });
                    return;
                  }
                  window.open(fileUrl, "_blank", "noopener,noreferrer");
                }}
                disabled={!getFileUrl(doc.url)}
              >
                <ExternalLink className="mr-1 h-3 w-3" />
                Abrir
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-red-600 dark:text-red-400"
                    onClick={() => deleteMutation.mutate(doc.id)}
                  >
                    Excluir documento
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const hasAnyDocument = docs.length > 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Documentos da Empresa</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Gerencie certidões, contratos e documentos de habilitação da sua empresa.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome"
            className="pl-9"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100"
        >
          <option value="">Todas as categorias</option>
          {Object.entries(DocumentCategory).map(([key, value]) => (
            <option key={key} value={value}>
              {categoryLabels[value] || value}
            </option>
          ))}
        </select>
        <Button onClick={() => openUploadModal()}>+ Novo Documento</Button>
      </div>

      {isLoading ? (
        <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700/60"><CardContent className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">Carregando documentos...</CardContent></Card>
      ) : !hasAnyDocument ? (
        <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700/60">
          <CardContent className="p-10 text-center">
            <FolderOpen className="mx-auto mb-3 h-8 w-8 text-gray-400 dark:text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Nenhum documento encontrado</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
              Adicione certidões, alvarás e documentos de habilitação da sua empresa.
            </p>
            <Button className="mt-4" onClick={() => openUploadModal()}>
              + Adicionar primeiro documento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Documentos Gerais da Empresa</h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">{globalDocs.length} documento(s)</span>
            </div>
            {globalDocs.length === 0 ? (
              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700/60"><CardContent className="p-5 text-sm text-gray-500 dark:text-gray-400">Nenhum documento geral encontrado.</CardContent></Card>
            ) : (
              <div className="space-y-3">{globalDocs.map(renderDocCard)}</div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Documentos por Licitação</h2>
            {Object.keys(groupedByBid).length === 0 ? (
              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700/60"><CardContent className="p-5 text-sm text-gray-500 dark:text-gray-400">Nenhum documento vinculado a licitações.</CardContent></Card>
            ) : (
              Object.entries(groupedByBid).map(([bidId, bidDocuments]) => (
                <div key={bidId} className="space-y-3 rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-3 py-2">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {bidsById.get(bidId) || "Licitação sem título"}
                    </h3>
                    <Link href={`/licitacoes/${bidId}`}>
                      <Button variant="outline" size="sm">Ver licitação</Button>
                    </Link>
                  </div>
                  <div className="space-y-3">{bidDocuments.map(renderDocCard)}</div>
                </div>
              ))
            )}
          </section>
        </div>
      )}

      <Dialog open={uploadState.open} onOpenChange={(open) => !open && closeUploadModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{uploadState.documentId ? "Atualizar arquivo" : "Novo Documento"}</DialogTitle>
            <DialogDescription>
              Preencha os dados do documento e envie o arquivo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nome do documento *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label>Categoria *</Label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as Categoria)}
                className="h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100"
              >
                {Object.entries(DocumentCategory).map(([key, value]) => (
                  <option key={key} value={value}>
                    {categoryLabels[value] || value}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={linkToBid}
                  onChange={(e) => setLinkToBid(e.target.checked)}
                />
                Vinculado a licitação?
              </Label>
              {linkToBid && (
                <select
                  value={selectedBidId}
                  onChange={(e) => setSelectedBidId(e.target.value)}
                  className="h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100"
                >
                  <option value="">Selecione uma licitação ativa</option>
                  {bids.map((bid) => (
                    <option key={bid.id} value={bid.id}>
                      {bid.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Arquivo</Label>
              <div
                {...getRootProps()}
                className={`cursor-pointer rounded-lg border border-dashed p-5 text-center text-sm ${
                  isDragActive
                    ? "border-primary bg-gray-50 dark:bg-gray-800/50"
                    : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                }`}
              >
                <input {...getInputProps()} />
                {selectedFile ? (
                  <p className="font-medium text-gray-700 dark:text-gray-200">{selectedFile.name}</p>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">Arraste ou clique para selecionar (PDF, DOCX, IMG até 10MB)</p>
                )}
              </div>
            </div>

            {uploading && (
              <div className="space-y-1">
                <div className="h-2 w-full rounded bg-gray-100 dark:bg-gray-800">
                  <div className="h-2 rounded bg-primary transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{uploadProgress}%</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeUploadModal} disabled={uploading}>
              Cancelar
            </Button>
            <Button onClick={() => uploadMutation.mutate()} disabled={uploading}>
              {uploading ? "Salvando..." : "Salvar documento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
