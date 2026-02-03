import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { Plano } from "@licitafacil/shared";
import { TipoPlano } from "@licitafacil/shared";
import { PlanoLimitValidator } from "./validators/plano-limit.validator";

/**
 * Limites do plano para uma empresa (para validações)
 */
export interface LimitesPlano {
  maxUsuarios: number;
  maxEmpresas: number;
  usuariosExtrasContratados: number;
  tipo: TipoPlano;
  permiteUsuariosExtras: boolean;
}

@Injectable()
export class PlanoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planoLimitValidator: PlanoLimitValidator,
  ) {}

  /**
   * Lista todos os planos ativos (para exibição em cadastro/seleção)
   */
  async findAll(): Promise<Plano[]> {
    const planos = await this.prisma.plano.findMany({
      where: { ativo: true },
      orderBy: { precoMensal: "asc" },
    });
    return planos.map((p) => this.mapToPlano(p));
  }

  /**
   * Busca plano por ID
   */
  async findById(id: string): Promise<Plano> {
    const plano = await this.prisma.plano.findUnique({
      where: { id },
    });
    if (!plano) {
      throw new NotFoundException(`Plano com ID ${id} não encontrado`);
    }
    return this.mapToPlano(plano);
  }

  /**
   * Retorna o uso do plano da empresa (usuários ativos, limite, pode adicionar).
   * Usado no frontend para exibir "X/Y usuários" e habilitar/desabilitar botão de novo usuário.
   */
  async getUsoByEmpresaId(empresaId: string): Promise<{
    usuariosAtivos: number;
    limiteUsuarios: number;
    podeAdicionarUsuario: boolean;
    plano: { id: string; nome: string; tipo: TipoPlano; maxUsuarios: number };
    usuariosExtrasContratados: number;
  }> {
    const limites = await this.getLimitesByEmpresaId(empresaId);
    const usuariosAtivos = await this.prisma.user.count({
      where: { empresaId, deletedAt: null },
    });
    const limiteUsuarios = limites.maxUsuarios + limites.usuariosExtrasContratados;
    const podeAdicionarUsuario = usuariosAtivos < limiteUsuarios;

    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      include: { plano: true },
    });

    if (!empresa?.plano) {
      throw new BadRequestException("Empresa sem plano associado");
    }

    return {
      usuariosAtivos,
      limiteUsuarios,
      podeAdicionarUsuario,
      plano: {
        id: empresa.plano.id,
        nome: empresa.plano.nome,
        tipo: empresa.plano.tipo as TipoPlano,
        maxUsuarios: empresa.plano.maxUsuarios,
      },
      usuariosExtrasContratados: empresa.usuariosExtrasContratados,
    };
  }

  /**
   * Retorna os limites do plano da empresa (para validações de negócio)
   */
  async getLimitesByEmpresaId(empresaId: string): Promise<LimitesPlano> {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      include: { plano: true },
    });
    if (!empresa) {
      throw new NotFoundException(`Empresa com ID ${empresaId} não encontrada`);
    }
    if (!empresa.plano) {
      throw new BadRequestException("Empresa sem plano associado");
    }
    const plano = empresa.plano;
    const permiteUsuariosExtras = plano.tipo === TipoPlano.EMPRESA;
    return {
      maxUsuarios: plano.maxUsuarios,
      maxEmpresas: plano.maxEmpresas,
      usuariosExtrasContratados: empresa.usuariosExtrasContratados,
      tipo: plano.tipo as TipoPlano,
      permiteUsuariosExtras,
    };
  }

  /**
   * Valida se a empresa pode adicionar mais um usuário.
   * Lança BadRequestException com mensagem clara se o limite foi atingido.
   */
  async assertCanAddUser(empresaId: string): Promise<void> {
    await this.planoLimitValidator.validateLimiteUsuarios(empresaId);
  }

  /**
   * Valida configuração ao criar/atualizar empresa: plano deve existir, estar ativo,
   * e usuariosExtrasContratados só é permitido no plano EMPRESA.
   */
  async assertValidEmpresaPlanConfig(planoId: string, usuariosExtrasContratados: number): Promise<void> {
    await this.planoLimitValidator.validateConfigEmpresa(planoId, usuariosExtrasContratados);
  }

  private mapToPlano(p: {
    id: string;
    nome: string;
    tipo: string;
    maxEmpresas: number;
    maxUsuarios: number;
    precoMensal: unknown;
    ativo: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): Plano {
    return {
      id: p.id,
      nome: p.nome,
      tipo: p.tipo as TipoPlano,
      maxEmpresas: p.maxEmpresas,
      maxUsuarios: p.maxUsuarios,
      precoMensal: Number(p.precoMensal),
      ativo: p.ativo,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }
}
