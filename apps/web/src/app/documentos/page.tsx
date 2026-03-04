"use client";

import { Layout } from "@/components/layout";
import { AuthGuard } from "@/components/AuthGuard";
import { CompanyDocumentsPageClient } from "./CompanyDocumentsPageClient";

export default function DocumentosPage() {
  return (
    <AuthGuard>
      <Layout>
        <div className="mx-auto w-full">
          <CompanyDocumentsPageClient />
        </div>
      </Layout>
    </AuthGuard>
  );
}
