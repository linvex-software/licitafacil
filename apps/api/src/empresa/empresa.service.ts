import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PlanoService } from "../plano/plano.service";
import type { CreateEmpresaInput, Empresa, UpdateEmpresaPlanoInput } from "@licitafacil/shared";

@Injectable()
export class EmpresaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planoService: PlanoService,
  ) {}

  /**
   * Cria uma nova empresa (com plano e opcionalmente usuários extras)
   */
  async create(data: CreateEmpresaInput): Promise<Empresa> {
    await this.planoService.assertValidEmpresaPlanConfig(data.planoId, data.usuariosExtrasContratados ?? 0);

    const empresa = await this.prisma.empresa.create({
      data: {
        name: data.name,
        planoId: data.planoId,
        usuariosExtrasContratados: data.usuariosExtrasContratados ?? 0,
      },
    });

    return this.mapToEmpresa(empresa);
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

    return this.mapToEmpresa(empresa);
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

    return this.mapToEmpresa(empresa);
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

  /**
   * Atualiza o plano da empresa (upgrade/downgrade ou usuários extras).
   * Valida: novo limite deve ser >= quantidade atual de usuários ativos.
   */
  async updatePlano(empresaId: string, userEmpresaId: string, data: UpdateEmpresaPlanoInput): Promise<Empresa> {
    if (empresaId !== userEmpresaId) {
      throw new ForbiddenException("Acesso negado: você só pode alterar o plano da sua empresa");
    }

    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      include: { plano: true },
    });

    if (!empresa) {
      throw new NotFoundException(`Empresa com ID ${empresaId} não encontrada`);
    }

    const planoId = data.planoId ?? empresa.planoId;
    const usuariosExtrasContratados = data.usuariosExtrasContratados ?? empresa.usuariosExtrasContratados;

    await this.planoService.assertValidEmpresaPlanConfig(planoId, usuariosExtrasContratados);

    const novoPlano = await this.prisma.plano.findUnique({
      where: { id: planoId },
    });

    if (!novoPlano) {
      throw new NotFoundException(`Plano com ID ${planoId} não encontrado`);
    }

    const usuariosAtivos = await this.prisma.user.count({
      where: { empresaId, deletedAt: null },
    });
    const novoLimite = novoPlano.maxUsuarios + usuariosExtrasContratados;

    if (usuariosAtivos > novoLimite) {
      throw new BadRequestException(
        `O plano selecionado permite até ${novoLimite} usuário(s). Sua empresa tem ${usuariosAtivos} usuário(s) ativo(s). Remova usuários ou escolha um plano com limite maior.`,
      );
    }

    const updated = await this.prisma.empresa.update({
      where: { id: empresaId },
      data: { planoId, usuariosExtrasContratados },
    });

    return this.mapToEmpresa(updated);
  }

  private mapToEmpresa(empresa: {
    id: string;
    name: string;
    planoId: string;
    usuariosExtrasContratados: number;
    createdAt: Date;
    updatedAt: Date;
  }): Empresa {
    return {
      id: empresa.id,
      name: empresa.name,
      planoId: empresa.planoId,
      usuariosExtrasContratados: empresa.usuariosExtrasContratados,
      createdAt: empresa.createdAt.toISOString(),
      updatedAt: empresa.updatedAt.toISOString(),
    };
  }
}
