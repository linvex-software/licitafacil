import { Layout } from "@/components/layout";

export default function PlaceholderPage() {
    return (
        <Layout>
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <h1 className="text-3xl font-bold text-slate-900">Em Desenvolvimento</h1>
                <p className="text-slate-500 mt-2">Esta funcionalidade estará disponível em breve.</p>
            </div>
        </Layout>
    );
}
