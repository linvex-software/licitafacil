import { PrismaClient, PlanoTipo, ClienteStatus, UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

async function upsertCliente(options: {
  empresaId: string;
  empresaNome: string;
  cnpj: string;
  emailComercial: string;
  plano: PlanoTipo;
  status: ClienteStatus;
  maxUsuarios: number;
  dataProximaCobranca: Date;
  criarUsuarios: number;
}) {
  const senhaHash = await bcrypt.hash("Admin@123", 10);

  const empresa = await prisma.empresa.upsert({
    where: { id: options.empresaId },
    update: { name: options.empresaNome },
    create: { id: options.empresaId, name: options.empresaNome },
  });

  await prisma.clienteConfig.upsert({
    where: { empresaId: empresa.id },
    update: {
      cnpj: options.cnpj,
      email: options.emailComercial,
      plano: options.plano,
      status: options.status,
      maxUsuarios: options.maxUsuarios,
      dataProximaCobranca: options.dataProximaCobranca,
      deletedAt: null,
    },
    create: {
      empresaId: empresa.id,
      cnpj: options.cnpj,
      email: options.emailComercial,
      plano: options.plano,
      status: options.status,
      valorSetup: 0,
      mensalidade: 0,
      dataInicio: new Date(),
      dataProximaCobranca: options.dataProximaCobranca,
      maxUsuarios: options.maxUsuarios,
    },
  });

  // garante um admin do tenant para login/teste
  await prisma.user.upsert({
    where: { email: `admin+${options.empresaId}@limvex.com.br` },
    update: { empresaId: empresa.id, deletedAt: null },
    create: {
      name: `Admin ${options.empresaNome}`,
      email: `admin+${options.empresaId}@limvex.com.br`,
      password: senhaHash,
      role: UserRole.ADMIN,
      empresaId: empresa.id,
    },
  });

  // cria usuários adicionais para simular downgrade inválido/limites
  for (let i = 1; i <= options.criarUsuarios; i++) {
    const email = `user${i}+${options.empresaId}@limvex.com.br`;
    await prisma.user.upsert({
      where: { email },
      update: { empresaId: empresa.id, deletedAt: null },
      create: {
        name: `User ${i} ${options.empresaNome}`,
        email,
        password: senhaHash,
        role: UserRole.COLABORADOR,
        empresaId: empresa.id,
      },
    });
  }

  return empresa;
}

export async function seedClientesPL03() {
  const now = new Date();

  const clientes = [
    {
      empresaId: "11111111-1111-1111-1111-111111111111",
      empresaNome: "Cliente Seed Starter (2 users)",
      cnpj: "11.111.111/0001-11",
      emailComercial: "financeiro+starter@limvex.com.br",
      plano: PlanoTipo.STARTER,
      status: ClienteStatus.ATIVO,
      maxUsuarios: 2,
      dataProximaCobranca: addDays(now, 7),
      criarUsuarios: 1, // + admin = 2
    },
    {
      empresaId: "22222222-2222-2222-2222-222222222222",
      empresaNome: "Cliente Seed Growth (5 users)",
      cnpj: "22.222.222/0001-22",
      emailComercial: "financeiro+growth@limvex.com.br",
      plano: PlanoTipo.PROFESSIONAL,
      status: ClienteStatus.ATIVO,
      maxUsuarios: 5,
      dataProximaCobranca: addDays(now, 14),
      criarUsuarios: 4, // + admin = 5
    },
    {
      empresaId: "33333333-3333-3333-3333-333333333333",
      empresaNome: "Cliente Seed Suspenso",
      cnpj: "33.333.333/0001-33",
      emailComercial: "financeiro+suspenso@limvex.com.br",
      plano: PlanoTipo.PROFESSIONAL,
      status: ClienteStatus.SUSPENSO,
      maxUsuarios: 5,
      dataProximaCobranca: addDays(now, 3),
      criarUsuarios: 2,
    },
    {
      empresaId: "44444444-4444-4444-4444-444444444444",
      empresaNome: "Cliente Seed Scale (downgrade bloqueado)",
      cnpj: "44.444.444/0001-44",
      emailComercial: "financeiro+scale@limvex.com.br",
      plano: PlanoTipo.ENTERPRISE,
      status: ClienteStatus.ATIVO,
      maxUsuarios: 999999,
      dataProximaCobranca: addDays(now, 30),
      criarUsuarios: 6, // + admin = 7 (downgrade para STARTER deve falhar)
    },
  ] as const;

  for (const c of clientes) {
    const empresa = await upsertCliente(c);
    console.log(`[seed pl03] OK: ${empresa.name} (${empresa.id})`);
    console.log(`[seed pl03] login: admin+${c.empresaId}@limvex.com.br / senha: Admin@123`);
  }
}

if (require.main === module) {
  seedClientesPL03()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

