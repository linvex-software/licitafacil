import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Seed F10-01: Criando dados de teste para alertas ===\n");

  // 1. Buscar empresa existente com usuários
  const empresa = await prisma.empresa.findFirst({
    where: { deletedAt: null },
    include: { users: { where: { deletedAt: null } } },
  });

  if (!empresa || empresa.users.length === 0) {
    console.error("Empresa ou usuário não encontrado. Rode o seed principal primeiro.");
    process.exit(1);
  }

  const usuario = empresa.users[0];
  console.log(`Empresa: ${empresa.name}`);
  console.log(`Usuário: ${usuario.name} (${usuario.email})`);

  // 2. Gerar unsubscribeToken se não existir
  if (!usuario.unsubscribeToken) {
    await prisma.user.update({
      where: { id: usuario.id },
      data: {
        unsubscribeToken: randomBytes(32).toString("hex"),
        receberEmails: true,
        receberDocVencendo: true,
        receberPrazoCritico: true,
        receberRisco: true,
      },
    });
    console.log("unsubscribeToken gerado para o usuário");
  } else {
    console.log("unsubscribeToken já existe");
  }

  // 3. Buscar ou criar licitação base para os testes
  let licitacao = await prisma.bid.findFirst({
    where: { empresaId: empresa.id, deletedAt: null },
  });

  if (!licitacao) {
    licitacao = await prisma.bid.create({
      data: {
        empresaId: empresa.id,
        title: "PE 001/2026 - Licitação Base para Testes",
        agency: "Prefeitura Municipal de Teste",
        modality: "PREGAO_ELETRONICO",
        legalStatus: "PARTICIPANDO",
        operationalState: "EM_ANDAMENTO",
      },
    });
    console.log("Licitação base criada");
  } else {
    console.log(`Licitação base encontrada: ${licitacao.title}`);
  }

  // ---------------------------------------------------------------
  // TESTE 1: Documento vencendo em 5 dias
  // ---------------------------------------------------------------
  const em5dias = new Date();
  em5dias.setDate(em5dias.getDate() + 5);

  await prisma.document.create({
    data: {
      empresaId: empresa.id,
      name: "Certidão Negativa de Débitos Federais - TESTE",
      filename: "cnd-federal-teste.pdf",
      mimeType: "application/pdf",
      size: 1024,
      category: "CERTIDAO",
      url: "uploads/teste/cnd-federal-teste.pdf",
      uploadedBy: usuario.id,
      bidId: licitacao.id,
      doesExpire: true,
      expiresAt: em5dias,
      alertaVencimentoEnviado: false,
    },
  });
  console.log("\n[TESTE 1] Documento vencendo em 5 dias criado");

  // ---------------------------------------------------------------
  // TESTE 2: Prazo crítico em 2 dias
  // ---------------------------------------------------------------
  const licitacaoPrazo = await prisma.bid.create({
    data: {
      empresaId: empresa.id,
      title: "PE TESTE 002/2026 - Prazo Crítico em 2 dias",
      agency: "Prefeitura Municipal de São Paulo",
      modality: "PREGAO_ELETRONICO",
      legalStatus: "PARTICIPANDO",
      operationalState: "EM_ANDAMENTO",
      alertaPrazoEnviado: false,
    },
  });

  const em2dias = new Date();
  em2dias.setDate(em2dias.getDate() + 2);

  await prisma.prazo.create({
    data: {
      empresaId: empresa.id,
      bidId: licitacaoPrazo.id,
      titulo: "Abertura de Propostas",
      dataPrazo: em2dias,
      descricao: "Prazo de teste para validar alertas de prazo crítico",
    },
  });
  console.log("[TESTE 2] Licitação com prazo crítico em 2 dias criada");

  // ---------------------------------------------------------------
  // TESTE 3: Licitação em risco
  // ---------------------------------------------------------------
  await prisma.bid.create({
    data: {
      empresaId: empresa.id,
      title: "PE TESTE 003/2026 - Licitação em Risco",
      agency: "Prefeitura Municipal de São Paulo",
      modality: "PREGAO_ELETRONICO",
      legalStatus: "PARTICIPANDO",
      operationalState: "EM_RISCO",
      riskReason: "Documento CND Federal vencido, proposta técnica pendente",
      alertaRiscoEnviado: false,
    },
  });
  console.log("[TESTE 3] Licitação em risco criada");

  // ---------------------------------------------------------------
  console.log("\n=== Seed concluído! ===");
  console.log(`Emails serão enviados para: ${usuario.email}`);
  console.log("\nPróximos passos:");
  console.log("  1. POST http://localhost:3001/email/test-cron  (dispara o cron)");
  console.log('  2. POST http://localhost:3001/email/test       (teste individual)');
}

main()
  .catch((e) => {
    console.error("Erro:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
