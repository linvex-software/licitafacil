import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...");

  // 1. Criar empresa (tenant)
  console.log("📦 Criando empresa...");
  const empresa = await prisma.empresa.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Empresa de Teste DEV",
    },
  });
  console.log(`✅ Empresa criada: ${empresa.id} - ${empresa.name}`);

  // 2. Criar usuário
  console.log("👤 Criando usuário...");
  const hashedPassword = await bcrypt.hash("senha123", 10);
  const user = await prisma.user.upsert({
    where: { email: "dev@teste.com" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      email: "dev@teste.com",
      password: hashedPassword,
      name: "Usuário DEV",
      role: "ADMIN",
      empresaId: empresa.id,
    },
  });
  console.log(`✅ Usuário criado: ${user.id} - ${user.email}`);

  // 3. Criar licitação
  console.log("📋 Criando licitação...");
  const licitacao = await prisma.bid.upsert({
    where: { id: "00000000-0000-0000-0000-000000000003" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000003",
      empresaId: empresa.id,
      title: "Licitação de Teste - Checklist",
      agency: "Prefeitura Municipal de Teste",
      modality: "PREGAO_ELETRONICO",
      legalStatus: "PARTICIPANDO",
      operationalState: "EM_ANDAMENTO",
    },
  });
  console.log(`✅ Licitação criada: ${licitacao.id} - ${licitacao.title}`);

  // 4. Criar documento para evidência (opcional)
  console.log("📄 Criando documento de evidência...");
  const documento = await prisma.document.upsert({
    where: { id: "00000000-0000-0000-0000-000000000004" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000004",
      empresaId: empresa.id,
      bidId: licitacao.id,
      name: "Documento de Evidência",
      filename: "evidencia-teste.pdf",
      mimeType: "application/pdf",
      size: 1024,
      category: "OUTROS",
      url: "/uploads/evidencia-teste.pdf",
      uploadedBy: user.id,
    },
  });
  console.log(`✅ Documento criado: ${documento.id} - ${documento.name}`);

  // 5. Criar 3 itens de checklist
  console.log("✅ Criando itens de checklist...");

  // Item 1: sem evidência exigida
  const item1 = await prisma.checklistItem.upsert({
    where: { id: "00000000-0000-0000-0000-000000000005" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000005",
      empresaId: empresa.id,
      licitacaoId: licitacao.id,
      titulo: "Item 1: Sem evidência exigida",
      descricao: "Este item não exige evidência para ser concluído",
      exigeEvidencia: false,
      concluido: false,
    },
  });
  console.log(`✅ Item 1 criado: ${item1.id} - ${item1.titulo}`);

  // Item 2: com evidência exigida, mas sem evidência (deve bloquear)
  const item2 = await prisma.checklistItem.upsert({
    where: { id: "00000000-0000-0000-0000-000000000006" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000006",
      empresaId: empresa.id,
      licitacaoId: licitacao.id,
      titulo: "Item 2: Exige evidência (sem evidência) - DEVE BLOQUEAR",
      descricao: "Este item exige evidência mas não tem documento vinculado. A conclusão deve ser bloqueada.",
      exigeEvidencia: true,
      concluido: false,
      evidenciaId: null, // Sem evidência
    },
  });
  console.log(`✅ Item 2 criado: ${item2.id} - ${item2.titulo}`);

  // Item 3: com evidência exigida e com evidência (deve permitir)
  const item3 = await prisma.checklistItem.upsert({
    where: { id: "00000000-0000-0000-0000-000000000007" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000007",
      empresaId: empresa.id,
      licitacaoId: licitacao.id,
      titulo: "Item 3: Exige evidência (com evidência) - DEVE PERMITIR",
      descricao: "Este item exige evidência e já tem documento vinculado. A conclusão deve ser permitida.",
      exigeEvidencia: true,
      concluido: false,
      evidenciaId: documento.id, // Com evidência
    },
  });
  console.log(`✅ Item 3 criado: ${item3.id} - ${item3.titulo}`);

  console.log("\n🎉 Seed concluído com sucesso!");
  console.log("\n📝 IDs para usar no frontend:");
  console.log(`   Usuário ID: ${user.id}`);
  console.log(`   Empresa ID: ${empresa.id}`);
  console.log(`   Licitação ID: ${licitacao.id}`);
  console.log(`\n🌐 URL do checklist:`);
  console.log(`   http://localhost:3000/licitacoes/${licitacao.id}/checklist`);
  console.log(`\n🔑 Variáveis de ambiente para o frontend (.env.local):`);
  console.log(`   NEXT_PUBLIC_DEV_USER_ID=${user.id}`);
  console.log(`   NEXT_PUBLIC_DEV_EMPRESA_ID=${empresa.id}`);
}

main()
  .catch((e) => {
    console.error("❌ Erro ao executar seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
