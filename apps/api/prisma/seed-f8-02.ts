import {
  PrismaClient,
  ContratoStatus,
  TipoPagamento,
  PlanoTipo,
  ClienteStatus,
} from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed F8-02...\n");

  // 1. Buscar clientes existentes via ClienteConfig
  let construtoraConfig = await prisma.clienteConfig.findFirst({
    where: { cnpj: { contains: "12.345.678" } },
    include: { empresa: true },
  });

  let techCorpConfig = await prisma.clienteConfig.findFirst({
    where: { cnpj: { contains: "98.765.432" } },
    include: { empresa: true },
  });

  // Se não existem, criar empresas + configs de teste
  if (!construtoraConfig) {
    console.log("📦 Criando Construtora ABC (empresa de teste)...");
    const empresa = await prisma.empresa.create({
      data: { name: "Construtora ABC" },
    });

    construtoraConfig = await prisma.clienteConfig.create({
      data: {
        empresaId: empresa.id,
        cnpj: "12.345.678/0001-90",
        email: "contato@construtorabc.com.br",
        telefone: "(11) 99999-1111",
        responsavelComercial: "Carlos Vendedor",
        plano: PlanoTipo.STARTER,
        valorSetup: 5000.0,
        mensalidade: 1500.0,
        dataInicio: new Date("2025-01-01"),
        status: ClienteStatus.ATIVO,
        maxUsuarios: 10,
        maxStorageGB: 10,
        maxLicitacoesMes: 50,
      },
      include: { empresa: true },
    });

    // Criar admin para Construtora
    const senhaHash = await bcrypt.hash("Construt@123", 10);
    await prisma.user.create({
      data: {
        email: "admin@construtorabc.com.br",
        password: senhaHash,
        name: "Admin Construtora",
        role: "ADMIN",
        empresaId: empresa.id,
      },
    });
    console.log("✅ Construtora ABC criada com admin");
  } else {
    console.log(
      `✅ Construtora ABC encontrada: ${construtoraConfig.empresa.name} (${construtoraConfig.empresa.id})`,
    );
  }

  if (!techCorpConfig) {
    console.log("📦 Criando TechCorp SA (empresa de teste)...");
    const empresa = await prisma.empresa.create({
      data: { name: "TechCorp SA" },
    });

    techCorpConfig = await prisma.clienteConfig.create({
      data: {
        empresaId: empresa.id,
        cnpj: "98.765.432/0001-10",
        email: "contato@techcorp.com.br",
        telefone: "(11) 99999-2222",
        responsavelComercial: "Ana SDR",
        plano: PlanoTipo.PROFESSIONAL,
        valorSetup: 10000.0,
        mensalidade: 3500.0,
        dataInicio: new Date("2024-12-01"),
        status: ClienteStatus.ATIVO,
        maxUsuarios: 30,
        maxStorageGB: 50,
        maxLicitacoesMes: 999999,
      },
      include: { empresa: true },
    });

    // Criar admin para TechCorp
    const senhaHash = await bcrypt.hash("TechCorp@123", 10);
    await prisma.user.create({
      data: {
        email: "admin@techcorp.com.br",
        password: senhaHash,
        name: "Admin TechCorp",
        role: "ADMIN",
        empresaId: empresa.id,
      },
    });
    console.log("✅ TechCorp SA criada com admin");
  } else {
    console.log(
      `✅ TechCorp SA encontrada: ${techCorpConfig.empresa.name} (${techCorpConfig.empresa.id})`,
    );
  }

  const construtoraEmpresaId = construtoraConfig.empresa.id;
  const techCorpEmpresaId = techCorpConfig.empresa.id;

  // 2. Criar contratos
  console.log("\n💰 Criando contratos...");

  const contratoConstrutora = await prisma.contrato.upsert({
    where: { empresaId: construtoraEmpresaId },
    update: {},
    create: {
      empresaId: construtoraEmpresaId,
      planoNome: "Starter",
      valorSetup: 5000.0,
      valorMensalidade: 1500.0,
      dataInicio: new Date("2025-01-01"),
      proximoVencimento: new Date("2026-03-10"), // Vencimento próximo
      status: ContratoStatus.ATIVO,
      observacoes: "Cliente inicial - plano Starter",
    },
  });
  console.log(`   ✅ Contrato Construtora ABC: ${contratoConstrutora.id}`);

  const contratoTechCorp = await prisma.contrato.upsert({
    where: { empresaId: techCorpEmpresaId },
    update: {},
    create: {
      empresaId: techCorpEmpresaId,
      planoNome: "Professional",
      valorSetup: 10000.0,
      valorMensalidade: 3500.0,
      dataInicio: new Date("2024-12-01"),
      proximoVencimento: new Date("2026-01-15"), // Vencido há ~26 dias (deve suspender)
      status: ContratoStatus.ATIVO,
      observacoes: "Cliente enterprise - plano Professional",
    },
  });
  console.log(`   ✅ Contrato TechCorp SA: ${contratoTechCorp.id}`);

  // 3. Criar histórico de pagamentos - Construtora ABC
  console.log("\n💳 Criando pagamentos...");

  // Limpar pagamentos existentes para evitar duplicatas
  await prisma.pagamento.deleteMany({
    where: { contratoId: contratoConstrutora.id },
  });
  await prisma.pagamento.deleteMany({
    where: { contratoId: contratoTechCorp.id },
  });

  await prisma.pagamento.createMany({
    data: [
      {
        contratoId: contratoConstrutora.id,
        tipo: TipoPagamento.SETUP,
        valor: 5000.0,
        dataPrevista: new Date("2025-01-01"),
        dataPago: new Date("2025-01-02"),
        metodoPagamento: "PIX",
        observacoes: "Pagamento inicial - setup",
      },
      {
        contratoId: contratoConstrutora.id,
        tipo: TipoPagamento.MENSALIDADE,
        valor: 1500.0,
        dataPrevista: new Date("2025-02-01"),
        dataPago: new Date("2025-02-01"),
        metodoPagamento: "Boleto",
        observacoes: "Mensalidade fevereiro/2025",
      },
      {
        contratoId: contratoConstrutora.id,
        tipo: TipoPagamento.MENSALIDADE,
        valor: 1500.0,
        dataPrevista: new Date("2026-03-10"),
        dataPago: null, // PENDENTE
        metodoPagamento: null,
        observacoes: "Mensalidade março/2026 - aguardando pagamento",
      },
    ],
  });
  console.log("   ✅ 3 pagamentos Construtora ABC (2 pagos, 1 pendente)");

  // 4. Criar pagamentos TechCorp (com atraso)
  await prisma.pagamento.createMany({
    data: [
      {
        contratoId: contratoTechCorp.id,
        tipo: TipoPagamento.SETUP,
        valor: 10000.0,
        dataPrevista: new Date("2024-12-01"),
        dataPago: new Date("2024-12-05"),
        metodoPagamento: "TED",
        observacoes: "Setup inicial",
      },
      {
        contratoId: contratoTechCorp.id,
        tipo: TipoPagamento.MENSALIDADE,
        valor: 3500.0,
        dataPrevista: new Date("2026-01-15"),
        dataPago: null, // VENCIDA
        metodoPagamento: null,
        observacoes: "ATRASADA - deve acionar suspensão automática",
      },
    ],
  });
  console.log("   ✅ 2 pagamentos TechCorp SA (1 pago, 1 vencido)");

  // 5. Criar usuários extras para testar limite (Construtora tem max 10)
  console.log("\n👥 Criando usuários para teste de limites...");

  const usuariosExistentes = await prisma.user.count({
    where: { empresaId: construtoraEmpresaId, deletedAt: null },
  });

  const totalDesejado = 9; // Queremos 9/10
  const usuariosParaCriar = Math.max(0, totalDesejado - usuariosExistentes);

  const senhaHashFake = await bcrypt.hash("Teste@123", 10);

  for (let i = 1; i <= usuariosParaCriar; i++) {
    const emailSuffix = `user${Date.now()}${i}@construtorabc.com.br`;
    try {
      await prisma.user.create({
        data: {
          email: emailSuffix,
          password: senhaHashFake,
          name: `Colaborador Teste ${i}`,
          role: "COLABORADOR",
          empresaId: construtoraEmpresaId,
        },
      });
    } catch {
      // Ignorar emails duplicados
    }
  }

  const totalUsuarios = await prisma.user.count({
    where: { empresaId: construtoraEmpresaId, deletedAt: null },
  });
  console.log(
    `   ✅ Construtora ABC agora tem ${totalUsuarios}/10 usuários`,
  );

  // 6. Criar licitações (Bids) para testar limite mensal
  console.log("\n📋 Criando licitações para teste de limites...");

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const licitacoesNoMes = await prisma.bid.count({
    where: {
      empresaId: construtoraEmpresaId,
      createdAt: { gte: inicioMes },
      deletedAt: null,
    },
  });

  const licitacoesDesejadas = 48; // Queremos 48/50
  const licitacoesParaCriar = Math.max(0, licitacoesDesejadas - licitacoesNoMes);

  for (let i = 1; i <= licitacoesParaCriar; i++) {
    await prisma.bid.create({
      data: {
        empresaId: construtoraEmpresaId,
        title: `Licitação de Teste #${i} - Validação F8-02`,
        agency: "Prefeitura Municipal de Teste",
        modality: "PREGAO_ELETRONICO",
        legalStatus: "PARTICIPANDO",
        operationalState: "EM_ANDAMENTO",
      },
    });
  }

  const totalLicitacoes = await prisma.bid.count({
    where: {
      empresaId: construtoraEmpresaId,
      createdAt: { gte: inicioMes },
      deletedAt: null,
    },
  });
  console.log(
    `   ✅ Construtora ABC agora tem ${totalLicitacoes}/50 licitações no mês`,
  );

  // Resumo
  console.log("\n" + "=".repeat(60));
  console.log("🎉 Seed F8-02 concluído com sucesso!");
  console.log("=".repeat(60));
  console.log("\n📊 Cenários de teste preparados:");
  console.log(
    `   1. Construtora ABC: ${totalUsuarios}/10 usuários (pode criar ${10 - totalUsuarios})`,
  );
  console.log(
    `   2. Construtora ABC: ${totalLicitacoes}/50 licitações no mês (pode criar ${50 - totalLicitacoes})`,
  );
  console.log(
    "   3. Construtora ABC: contrato ATIVO, 1 pagamento pendente 10/03/2026",
  );
  console.log(
    "   4. TechCorp SA: contrato ATIVO mas vencido desde 15/01/2026 (~26 dias)",
  );
  console.log("      → Deve ser suspenso pelo cron job");
  console.log(`\n🔗 IDs para referência:`);
  console.log(`   Construtora ABC empresaId: ${construtoraEmpresaId}`);
  console.log(`   TechCorp SA empresaId:     ${techCorpEmpresaId}`);
  console.log(`   Contrato Construtora:      ${contratoConstrutora.id}`);
  console.log(`   Contrato TechCorp:         ${contratoTechCorp.id}`);
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
