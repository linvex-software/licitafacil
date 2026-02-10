import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Verificar se já existe super admin
  const existente = await prisma.user.findUnique({
    where: { email: "admin@limvex.com.br" },
  });

  if (existente) {
    console.log("Super admin já existe. Pulando criação.");
    console.log("Email:", existente.email);
    console.log("ID:", existente.id);
    return;
  }

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

  // Criar super admin
  const superAdmin = await prisma.user.create({
    data: {
      name: "Admin Sistema",
      email: "admin@limvex.com.br",
      password: senhaHash,
      role: "SUPER_ADMIN",
      empresaId: empresaSistema.id,
    },
  });

  console.log("Super admin criado com sucesso!");
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
