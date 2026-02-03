"use client";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { AlertCircle, LogOut } from "lucide-react";

export default function AssinaturaVencidaPage() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="max-w-md w-full border-amber-200 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-amber-100">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
            <CardTitle className="text-xl font-heading text-slate-900">
              Assinatura vencida ou cancelada
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-slate-600">
            O acesso ao sistema está bloqueado porque a assinatura da sua empresa está vencida ou foi cancelada.
          </p>
          <p className="text-sm text-slate-500">
            Entre em contato com o suporte para renovar sua assinatura e voltar a acessar o LicitaFácil.
          </p>
          <div className="pt-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => logout()}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair do sistema
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
