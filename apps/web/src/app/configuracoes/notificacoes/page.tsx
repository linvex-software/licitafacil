"use client";

import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Bell, FileText, Clock, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface NotificacoesConfig {
  receberEmails: boolean;
  receberDocVencendo: boolean;
  receberPrazoCritico: boolean;
  receberRisco: boolean;
  frequenciaEmail: string;
}

export default function NotificacoesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [config, setConfig] = useState<NotificacoesConfig>({
    receberEmails: true,
    receberDocVencendo: true,
    receberPrazoCritico: true,
    receberRisco: true,
    frequenciaEmail: "IMEDIATO",
  });

  useEffect(() => {
    carregarConfig();
  }, []);

  async function carregarConfig() {
    try {
      const response = await api.get("/users/me/notificacoes");
      setConfig(response.data);
    } catch (error) {
      console.error("Erro ao carregar configurações de notificação:", error);
    } finally {
      setLoadingConfig(false);
    }
  }

  async function salvarConfig() {
    setLoading(true);
    try {
      await api.patch("/users/me/notificacoes", config);
      toast({
        title: "Configurações salvas",
        description: "Suas preferências de notificação foram atualizadas.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (loadingConfig) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <p className="text-gray-500 dark:text-gray-400">Carregando configurações...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Configurações de Notificações
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Controle quais alertas você deseja receber por email.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notificações por Email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Toggle principal */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Receber emails</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Ativar ou desativar todos os emails de notificação
                </p>
              </div>
              <Switch
                checked={config.receberEmails}
                onCheckedChange={(v) =>
                  setConfig({ ...config, receberEmails: v })
                }
              />
            </div>

            <hr className="border-gray-200 dark:border-gray-800" />

            {/* Documentos vencendo */}
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-amber-500 mt-0.5" />
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">
                    Documentos vencendo
                  </Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Aviso 7 dias antes do vencimento
                  </p>
                </div>
              </div>
              <Switch
                checked={config.receberDocVencendo}
                disabled={!config.receberEmails}
                onCheckedChange={(v) =>
                  setConfig({ ...config, receberDocVencendo: v })
                }
              />
            </div>

            {/* Prazos críticos */}
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-red-500 mt-0.5" />
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">
                    Prazos críticos
                  </Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Aviso 3 dias antes do prazo
                  </p>
                </div>
              </div>
              <Switch
                checked={config.receberPrazoCritico}
                disabled={!config.receberEmails}
                onCheckedChange={(v) =>
                  setConfig({ ...config, receberPrazoCritico: v })
                }
              />
            </div>

            {/* Licitações em risco */}
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">
                    Licitações em risco
                  </Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Alerta imediato quando risco detectado
                  </p>
                </div>
              </div>
              <Switch
                checked={config.receberRisco}
                disabled={!config.receberEmails}
                onCheckedChange={(v) =>
                  setConfig({ ...config, receberRisco: v })
                }
              />
            </div>

            <hr className="border-gray-200 dark:border-gray-800" />

            {/* Frequência */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Frequência</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Com que frequência receber alertas
                </p>
              </div>
              <Select
                value={config.frequenciaEmail}
                onValueChange={(v) =>
                  setConfig({ ...config, frequenciaEmail: v })
                }
                disabled={!config.receberEmails}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IMEDIATO">Imediato</SelectItem>
                  <SelectItem value="DIARIO">Diário (6h)</SelectItem>
                  <SelectItem value="OFF">Desativado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Button onClick={salvarConfig} disabled={loading} className="w-full">
          {loading ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </Layout>
  );
}
