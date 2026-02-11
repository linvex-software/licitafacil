import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seed F8-02: Criando licitações de teste para validar limites...\n");

  // Buscar a primeira empresa que tenha ClienteConfig (limite configurado)
  const config = await prisma.clienteConfig.findFirst({
    include: { empresa: true },
  });

  if (!config) {
    console.error(
      "❌ Nenhuma empresa com ClienteConfig encontrada.",
    );
    console.error(
      "   Execute primeiro: npx tsx prisma/seed-f8-02.ts",
    );
    process.exit(1);
  }

  const empresaId = config.empresaId;
  const limiteMensal = config.maxLicitacoesMes;

  console.log(`✅ Empresa encontrada: ${config.empresa.name} (ID: ${empresaId})`);
  console.log(`📊 Limite mensal: ${limiteMensal} licitações\n`);

  // Contar licitações existentes no mês atual
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const licitacoesExistentes = await prisma.bid.count({
    where: {
      empresaId,
      deletedAt: null,
      createdAt: { gte: inicioMes },
    },
  });

  console.log(`📊 Licitações existentes no mês: ${licitacoesExistentes}`);

  const alvo = limiteMensal - 2; // Deixar 2 vagas para teste manual

  if (licitacoesExistentes >= alvo) {
    console.log(
      `✅ Já existem ${licitacoesExistentes} licitações (alvo: ${alvo}). Nada a criar.`,
    );
    console.log(
      `📊 Limite: ${licitacoesExistentes}/${limiteMensal} — ${limiteMensal - licitacoesExistentes} vaga(s) disponível(is)`,
    );
    return;
  }

  const quantidadeACriar = alvo - licitacoesExistentes;
  console.log(`🔄 Criando ${quantidadeACriar} licitações para chegar a ${alvo}/${limiteMensal}...\n`);

  const modalidades = [
    "PREGAO_ELETRONICO",
    "CONCORRENCIA",
    "DISPENSA",
    "OUTRA",
  ];

  const statusJuridico = [
    "ANALISANDO",
    "PARTICIPANDO",
    "DESCARTADA",
    "VENCIDA",
    "PERDIDA",
  ];

  const estadoOperacional = ["OK", "EM_RISCO"];

  const orgaos = [
    "Prefeitura Municipal de São Paulo",
    "Governo do Estado de Minas Gerais",
    "Tribunal de Justiça do Paraná",
    "Universidade Federal do Rio de Janeiro",
    "Secretaria de Saúde de Brasília",
    "DNIT - Dept. Nacional de Infraestrutura",
    "Exército Brasileiro - Comando Logístico",
    "Ministério da Educação",
    "Prefeitura Municipal de Belo Horizonte",
    "Câmara dos Deputados",
    "INSS - Instituto Nacional do Seguro Social",
    "Petrobras - Sede RJ",
  ];

  const titulos = [
    "Aquisição de Equipamentos de Informática",
    "Contratação de Serviços de Limpeza",
    "Reforma do Prédio Administrativo",
    "Fornecimento de Material de Escritório",
    "Manutenção de Ar Condicionado",
    "Serviços de Vigilância Patrimonial",
    "Aquisição de Veículos Utilitários",
    "Contratação de Serviços de TI",
    "Obra de Pavimentação Urbana",
    "Fornecimento de Alimentação Hospitalar",
    "Implantação de Sistema de Gestão",
    "Aquisição de Mobiliário Escolar",
    "Serviços de Transporte de Cargas",
    "Reforma de Unidade Básica de Saúde",
    "Contratação de Consultoria Técnica",
  ];

  for (let i = 0; i < quantidadeACriar; i++) {
    const num = licitacoesExistentes + i + 1;
    await prisma.bid.create({
      data: {
        empresaId,
        title: `${titulos[i % titulos.length]} #${String(num).padStart(3, "0")}`,
        agency: orgaos[i % orgaos.length],
        modality: modalidades[i % modalidades.length],
        legalStatus: statusJuridico[i % statusJuridico.length],
        operationalState: estadoOperacional[i % estadoOperacional.length],
      },
    });

    if ((i + 1) % 10 === 0) {
      console.log(`  ✅ ${i + 1}/${quantidadeACriar} licitações criadas`);
    }
  }

  const totalFinal = await prisma.bid.count({
    where: {
      empresaId,
      deletedAt: null,
      createdAt: { gte: inicioMes },
    },
  });

  console.log(`\n🎉 Seed concluído com sucesso!`);
  console.log(`📊 Total de licitações no mês: ${totalFinal}/${limiteMensal}`);
  console.log(`📊 Vagas restantes: ${limiteMensal - totalFinal}`);
  console.log(
    `\n💡 Acesse http://localhost:3000/licitacoes para testar a criação das últimas ${limiteMensal - totalFinal} licitação(ões).`,
  );
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
