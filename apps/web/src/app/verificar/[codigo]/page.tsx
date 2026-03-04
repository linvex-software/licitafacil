async function getPeticao(codigo: string) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const res = await fetch(
      `${apiUrl}/juridico/verificar/${codigo}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function VerificarPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const peticao = await getPeticao(codigo);

  if (!peticao) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f8fafc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "40px 48px",
            border: "1px solid #e2e8f0",
            textAlign: "center",
            maxWidth: 420,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "#fee2e2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <span style={{ fontSize: 24 }}>✗</span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111", marginBottom: 8 }}>
            Documento não encontrado
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>
            O código de autenticidade informado não corresponde a nenhum documento em nossa base.
          </p>
          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 16 }}>
            Código consultado: <code style={{ fontFamily: "monospace" }}>{codigo}</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
        padding: 24,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "40px 48px",
          border: "1px solid #e2e8f0",
          maxWidth: 480,
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <div
            style={{
              width: 40,
              height: 40,
              background: "#0078D1",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 13, fontFamily: "monospace" }}>
              LX
            </span>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#111", letterSpacing: "0.04em" }}>
              LIMVEX
            </div>
            <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: "0.15em" }}>LICITAÇÃO</div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 24,
          }}
        >
          <span style={{ fontSize: 18 }}>✓</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#15803d", margin: 0 }}>
              Documento autêntico verificado
            </p>
            <p style={{ fontSize: 11, color: "#16a34a", margin: 0 }}>
              Este documento foi gerado pela plataforma Limvex Licitação
            </p>
          </div>
        </div>

        <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 20 }}>
          {[
            { label: "Tipo de documento", value: peticao.tipo },
            { label: "Empresa", value: peticao.empresaNome ?? "Não informado" },
            { label: "Processo licitatório", value: peticao.licitacaoTitulo ?? "Não informado" },
            {
              label: "Data de geração",
              value: new Date(peticao.createdAt).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              }),
            },
            { label: "Código de autenticidade", value: peticao.codigoAutenticidade },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                paddingBottom: 12,
                marginBottom: 12,
                borderBottom: "1px solid #f8fafc",
                gap: 16,
              }}
            >
              <span style={{ fontSize: 12, color: "#94a3b8" }}>{item.label}</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#334155",
                  fontFamily: "monospace",
                  textAlign: "right",
                }}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>

        <p
          style={{
            fontSize: 11,
            color: "#cbd5e1",
            textAlign: "center",
            marginTop: 20,
          }}
        >
          limvex.com · Plataforma de gestão de licitações públicas
        </p>
      </div>
    </div>
  );
}
