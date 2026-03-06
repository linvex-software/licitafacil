import { PrismaClient, UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();
const EMPRESA_ID = "00000000-0000-0000-0000-000000000001";

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

  console.log("Superadmin criado:", admin.email);
  console.log("Senha: Admin@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
