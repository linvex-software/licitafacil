import { ClienteStatus, PlanoTipo, PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

function cnpjFromEmpresaId(empresaId: string) {
  const digits = empresaId.replace(/\D/g, "");
  return digits.padStart(14, "0").slice(-14);
}

async function main() {
  // O User exige empresaId — criar empresa sistema para o super admin
  let empresaSistema = await prisma.empresa.findFirst({
    where: { name: "Limvex (Sistema)" },
  });

  if (!empresaSistema) {
    empresaSistema = await prisma.empresa.create({
      data: { name: "Limvex (Sistema)" },
    });
    console.log("Empresa sistema criada:", empresaSistema.id);
  }

  // Hash da senha
  const senhaHash = await bcrypt.hash("Admin@123", 10);

  // Criar (ou reaproveitar) super admin
  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@limvex.com.br" },
    update: {
      role: "SUPER_ADMIN",
      deletedAt: null,
      empresaId: empresaSistema.id,
    },
    create: {
      name: "Admin Sistema",
      email: "admin@limvex.com.br",
      password: senhaHash,
      role: "SUPER_ADMIN",
      empresaId: empresaSistema.id,
    },
  });

  await prisma.clienteConfig.upsert({
    where: { empresaId: superAdmin.empresaId },
    update: {
      plano: PlanoTipo.ENTERPRISE,
      status: ClienteStatus.ATIVO,
      email: superAdmin.email,
      deletedAt: null,
    },
    create: {
      empresaId: superAdmin.empresaId,
      cnpj: cnpjFromEmpresaId(superAdmin.empresaId),
      email: superAdmin.email,
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

  console.log("Super admin garantido com sucesso!");
  console.log("Email:", superAdmin.email);
  console.log("Senha: Admin@123");
  console.log("ID:", superAdmin.id);
  console.log("EmpresaId:", superAdmin.empresaId);
}

main()
  .catch((e) => {
    console.error("Erro ao criar super admin:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
