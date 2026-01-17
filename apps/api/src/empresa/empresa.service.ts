import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEmpresaInput, type Empresa } from "@licitafacil/shared";

@Injectable()
export class EmpresaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria uma nova empresa
   */
  async create(data: CreateEmpresaInput): Promise<Empresa> {
    const empresa = await this.prisma.empresa.create({
      data: {
        name: data.name,
      },
    });

    return {
      id: empresa.id,
      name: empresa.name,
      createdAt: empresa.createdAt.toISOString(),
      updatedAt: empresa.updatedAt.toISOString(),
    };
  }

  /**
   * Busca a empresa do usuário (isolamento por tenant)
   * Usuário só pode ver sua própria empresa
   */
  async findMyEmpresa(empresaId: string): Promise<Empresa> {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
    });

    if (!empresa) {
      throw new NotFoundException(`Empresa não encontrada`);
    }

    return {
      id: empresa.id,
      name: empresa.name,
      createdAt: empresa.createdAt.toISOString(),
      updatedAt: empresa.updatedAt.toISOString(),
    };
  }

  /**
   * Busca uma empresa por ID (com validação de tenant)
   * Só permite buscar a própria empresa
   */
  async findOne(id: string, userEmpresaId: string): Promise<Empresa> {
    // Validar se o usuário está tentando acessar sua própria empresa
    if (id !== userEmpresaId) {
      throw new ForbiddenException("Acesso negado: você só pode visualizar sua própria empresa");
    }

    const empresa = await this.prisma.empresa.findUnique({
      where: { id },
    });

    if (!empresa) {
      throw new NotFoundException(`Empresa com ID ${id} não encontrada`);
    }

    return {
      id: empresa.id,
      name: empresa.name,
      createdAt: empresa.createdAt.toISOString(),
      updatedAt: empresa.updatedAt.toISOString(),
    };
  }

  /**
   * Verifica se uma empresa existe
   * Usado internamente para validações
   */
  async exists(id: string): Promise<boolean> {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id },
      select: { id: true },
    });

    return !!empresa;
  }
}
