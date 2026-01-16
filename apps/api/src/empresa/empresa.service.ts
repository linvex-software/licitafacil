import { Injectable, NotFoundException } from "@nestjs/common";
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
   * Lista todas as empresas
   */
  async findAll(): Promise<Empresa[]> {
    const empresas = await this.prisma.empresa.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return empresas.map((empresa) => ({
      id: empresa.id,
      name: empresa.name,
      createdAt: empresa.createdAt.toISOString(),
      updatedAt: empresa.updatedAt.toISOString(),
    }));
  }

  /**
   * Busca uma empresa por ID
   */
  async findOne(id: string): Promise<Empresa> {
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
   */
  async exists(id: string): Promise<boolean> {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id },
      select: { id: true },
    });

    return !!empresa;
  }
}
