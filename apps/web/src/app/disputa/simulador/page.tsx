import { Layout } from "@/components/layout";
import { SimuladorDisputa } from "@/components/disputa/SimuladorDisputa";

export default function SimuladorDisputaPage() {
  return (
    <Layout>
      <div className="mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-900 mb-2">
            Simulador de Disputa
          </h1>
          <p className="text-slate-600">
            Calcule lances competitivos antes de entrar na disputa.
          </p>
        </div>

        <SimuladorDisputa showSaveButton />
      </div>
    </Layout>
  );
}
