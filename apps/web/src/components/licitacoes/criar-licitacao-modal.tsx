"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCreateBid } from "@/hooks/use-licitacoes";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ToastAction } from "@/components/ui/toast";
import { createPrazo, vincularPregaoMonitorado } from "@/lib/api";

interface CriarLicitacaoModalProps {
  onSuccess: () => void;
  limiteAtingido?: boolean;
}

const MODALIDADES = [
  { value: "PREGAO_ELETRONICO", label: "Pregão Eletrônico" },
  { value: "CONCORRENCIA", label: "Concorrência" },
  { value: "DISPENSA", label: "Dispensa" },
  { value: "OUTRA", label: "Outra" },
] as const;

const STATUS_JURIDICO = [
  { value: "ANALISANDO", label: "Analisando" },
  { value: "PARTICIPANDO", label: "Participando" },
  { value: "DESCARTADA", label: "Descartada" },
  { value: "VENCIDA", label: "Vencida" },
  { value: "PERDIDA", label: "Perdida" },
  { value: "CANCELADA", label: "Cancelada" },
] as const;

const ESTADO_OPERACIONAL = [
  { value: "OK", label: "OK" },
  { value: "EM_RISCO", label: "Em Risco" },
] as const;

const UF_LIST = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO",
  "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR",
  "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
] as const;

export function CriarLicitacaoModal({
  onSuccess,
}: CriarLicitacaoModalProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    agency: "",
    uf: "",
    municipio: "",
    modality: "PREGAO_ELETRONICO",
    legalStatus: "ANALISANDO",
    operationalState: "OK",
  });
  const [portal, setPortal] = useState<"PNCP" | "BNC" | "">("");
  const [dataAbertura, setDataAbertura] = useState<string>(""); // datetime-local
  const [pregaoId, setPregaoId] = useState<string>("");

  const { toast } = useToast();
  const createBid = useCreateBid();
  const queryClient = useQueryClient();
  const router = useRouter();

  const prefillFromQuery = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    if (params.get("criar") !== "true") return null;
    return {
      numero: params.get("numero") ?? "",
      objeto: params.get("objeto") ?? "",
      orgao: params.get("orgao") ?? "",
      portal: (params.get("portal") ?? "").toUpperCase(),
      data: params.get("data") ?? "",
      pregaoId: params.get("pregaoId") ?? "",
      uf: params.get("uf") ?? "",
    };
  }, []);

  useEffect(() => {
    const p = prefillFromQuery;
    if (!p) return;

    const title = [p.numero, p.objeto].filter(Boolean).join(" — ").slice(0, 500);
    setFormData((prev) => ({
      ...prev,
      title: title || prev.title,
      agency: (p.orgao || prev.agency).slice(0, 200),
      uf: (p.uf || prev.uf).toUpperCase(),
      modality: "PREGAO_ELETRONICO",
      legalStatus: "ANALISANDO",
      operationalState: "OK",
    }));

    const portalNorm = p.portal === "BNC" ? "BNC" : p.portal === "PNCP" ? "PNCP" : "";
    setPortal(portalNorm as any);

    // data pode vir ISO; converter para datetime-local "YYYY-MM-DDTHH:mm"
    if (p.data) {
      const d = new Date(p.data);
      if (!Number.isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const hh = String(d.getHours()).padStart(2, "0");
        const mi = String(d.getMinutes()).padStart(2, "0");
        setDataAbertura(`${yyyy}-${mm}-${dd}T${hh}:${mi}`);
      }
    }

    if (p.pregaoId) setPregaoId(p.pregaoId);
    setOpen(true);

    // Limpar query para não reabrir sempre (mantém a página /licitacoes limpa)
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("criar");
      url.searchParams.delete("numero");
      url.searchParams.delete("objeto");
      url.searchParams.delete("orgao");
      url.searchParams.delete("portal");
      url.searchParams.delete("data");
      url.searchParams.delete("pregaoId");
      url.searchParams.delete("uf");
      window.history.replaceState({}, "", url.toString());
    } catch {
      // ignore
    }
  }, [prefillFromQuery]);

  function resetForm() {
    setFormData({
      title: "",
      agency: "",
      uf: "",
      municipio: "",
      modality: "PREGAO_ELETRONICO",
      legalStatus: "ANALISANDO",
      operationalState: "OK",
    });
    setPortal("");
    setDataAbertura("");
    setPregaoId("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.title.trim() || !formData.agency.trim() || !formData.uf.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha título, órgão licitante e UF.",
        variant: "destructive",
      });
      return;
    }

    try {
      const created = await createBid.mutateAsync(formData);

      // Se veio do monitoramento e tem data, criar um prazo "Abertura"
      if (dataAbertura) {
        try {
          await createPrazo({
            bidId: (created as any).id,
            titulo: "Abertura",
            dataPrazo: new Date(dataAbertura).toISOString(),
            descricao: portal ? `Portal: ${portal}` : null,
          });
        } catch {
          // não bloquear criação da licitação por falha no prazo
        }
      }

      // Se o pregão monitorado tem id, vincular bidId no monitoramento
      if (pregaoId) {
        try {
          await vincularPregaoMonitorado(pregaoId, (created as any).id);
        } catch {
          // não bloquear criação da licitação por falha no vínculo
        }
      }

      toast({
        title: "Licitação criada",
        description: "A licitação foi adicionada com sucesso.",
        action: (
          <ToastAction altText="Abrir licitação" onClick={() => router.push(`/licitacoes/${(created as any).id}`)}>
            Abrir
          </ToastAction>
        ),
      });

      setOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["bid-limite"] });
      onSuccess();
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        "Erro ao criar licitação. Tente novamente.";
      toast({
        title: "Erro ao criar licitação",
        description: message,
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="shadow-none"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Licitação
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Nova Licitação</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Portal</Label>
              <Select value={portal || undefined} onValueChange={(v) => setPortal(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o portal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PNCP">PNCP</SelectItem>
                  <SelectItem value="BNC">BNC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dataAbertura">Data de abertura</Label>
              <Input
                id="dataAbertura"
                type="datetime-local"
                value={dataAbertura}
                onChange={(e) => setDataAbertura(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="title">Título / Objeto Resumido *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Ex: Aquisição de equipamentos de informática"
              required
            />
          </div>

          <div>
            <Label htmlFor="agency">Órgão Licitante *</Label>
            <Input
              id="agency"
              value={formData.agency}
              onChange={(e) =>
                setFormData({ ...formData, agency: e.target.value })
              }
              placeholder="Ex: Prefeitura Municipal de São Paulo"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>UF *</Label>
              <Select
                value={formData.uf || undefined}
                onValueChange={(v) =>
                  setFormData({ ...formData, uf: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a UF" />
                </SelectTrigger>
                <SelectContent>
                  {UF_LIST.map((uf) => (
                    <SelectItem key={uf} value={uf}>
                      {uf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="municipio">Município</Label>
              <Input
                id="municipio"
                value={formData.municipio}
                onChange={(e) =>
                  setFormData({ ...formData, municipio: e.target.value })
                }
                placeholder="Ex: São Paulo"
              />
            </div>

            <div>
              <Label>Modalidade *</Label>
              <Select
                value={formData.modality}
                onValueChange={(v) =>
                  setFormData({ ...formData, modality: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODALIDADES.map((mod) => (
                    <SelectItem key={mod.value} value={mod.value}>
                      {mod.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status Jurídico</Label>
              <Select
                value={formData.legalStatus}
                onValueChange={(v) =>
                  setFormData({ ...formData, legalStatus: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_JURIDICO.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Estado Operacional</Label>
            <Select
              value={formData.operationalState}
              onValueChange={(v) =>
                setFormData({ ...formData, operationalState: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESTADO_OPERACIONAL.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createBid.isPending}
              className="flex-1 shadow-none"
            >
              {createBid.isPending ? "Criando..." : "Criar Licitação"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
