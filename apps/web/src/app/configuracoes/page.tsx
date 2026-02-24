import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/ui/page-header";

export default function PlaceholderPage() {
    return (
        <Layout>
            <PageHeader
                breadcrumb={[
                    { label: "Configurações" },
                    { label: "Preferências" },
                ]}
                title="Preferências"
                subtitle="Configurações gerais da plataforma."
            />
            <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
                <h2 className="text-3xl font-bold text-slate-900">Em Desenvolvimento</h2>
                <p className="text-slate-500 mt-2">Esta funcionalidade estará disponível em breve.</p>
            </div>
        </Layout>
    );
}
