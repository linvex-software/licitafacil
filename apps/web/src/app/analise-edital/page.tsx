"use client";

import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/Card";
import { Sparkles, Upload } from "lucide-react";

export default function AnaliseEditalPage() {
  return (
    <Layout>
      <PageHeader
        breadcrumb={[
          { label: "Inteligência", href: "#" },
          { label: "Análise de Edital" },
        ]}
        title="Análise Inteligente de Editais"
        subtitle="IA avançada para extrair dados críticos em segundos"
        actions={
          <Button>
            <Upload className="w-4 h-4 mr-2" />
            Enviar Edital
          </Button>
        }
      />

      <div className="px-8 pb-8">
        <Card>
          <CardContent className="p-8 text-center">
            <Sparkles className="w-12 h-12 text-[#2563eb] mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Analise editais automaticamente
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Envie um PDF e receba em segundos: objeto, modalidade, prazos,
              documentação necessária e alertas de risco.
            </p>
            <Button size="lg">
              <Upload className="w-4 h-4 mr-2" />
              Selecionar Edital (PDF)
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
