import { ClienteStatus, PlanoTipo, PrismaClient, UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { seedClientesPL03 } from "./seed-clientes-pl03";

const prisma = new PrismaClient();
const EMPRESA_ID = "00000000-0000-0000-0000-000000000001";

function cnpjFromEmpresaId(empresaId: string) {
  const digits = empresaId.replace(/\D/g, "");
  return digits.padStart(14, "0").slice(-14);
}

async function main() {
  const senhaHash = await bcrypt.hash("Admin@123", 10);

  const empresa = await prisma.empresa.upsert({
    where: { id: EMPRESA_ID },
    update: {},
    create: {
      id: EMPRESA_ID,
      name: "Limvex Sistema",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@limvex.com.br" },
    update: {},
    create: {
      name: "Admin Sistema",
      email: "admin@limvex.com.br",
      password: senhaHash,
      role: UserRole.SUPER_ADMIN,
      empresaId: empresa.id,
    },
  });

  await prisma.clienteConfig.upsert({
    where: { empresaId: admin.empresaId },
    update: {
      plano: PlanoTipo.ENTERPRISE,
      status: ClienteStatus.ATIVO,
      email: admin.email,
      deletedAt: null,
    },
    create: {
      empresaId: admin.empresaId,
      cnpj: cnpjFromEmpresaId(admin.empresaId),
      email: admin.email,
      plano: PlanoTipo.ENTERPRISE,
      status: ClienteStatus.ATIVO,
      valorSetup: 0,
      mensalidade: 0,
      dataInicio: new Date(),
      maxUsuarios: 999999,
      maxStorageGB: 999999,
      maxLicitacoesMes: 999999,
      maxAnalisesMes: 999999,
    },
  });

  console.log("Superadmin criado:", admin.email);
  console.log("Senha: Admin@123");

  await seedClientesPL03();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
