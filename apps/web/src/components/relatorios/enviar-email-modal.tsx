"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface EnviarEmailModalProps {
  filtro: any;
  periodo: string;
  onClose: () => void;
}

export function EnviarEmailModal({
  filtro,
  periodo,
  onClose,
}: EnviarEmailModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [emailDestino, setEmailDestino] = useState("");
  const [mensagem, setMensagem] = useState(
    `Segue em anexo o relatório gerencial de licitações referente ao período: ${periodo}.`,
  );

  async function handleEnviar() {
    if (!emailDestino) return;
    setLoading(true);

    try {
      await api.post("/relatorios/enviar-email", {
        filtro,
        emailDestino,
        mensagem,
      });

      toast({ title: "Email enviado com sucesso!" });
      onClose();
    } catch {
      toast({ title: "Erro ao enviar email", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Enviar Relatório por Email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Email do destinatário *</Label>
            <Input
              type="email"
              placeholder="diretor@empresa.com.br"
              value={emailDestino}
              onChange={(e) => setEmailDestino(e.target.value)}
            />
          </div>

          <div>
            <Label>Mensagem (opcional)</Label>
            <Textarea
              rows={4}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
            />
          </div>

          <div className="text-xs text-gray-500">
            O PDF do relatório será gerado e enviado como anexo.
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleEnviar}
              disabled={loading || !emailDestino}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" /> Enviar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
