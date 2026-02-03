import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Mensagens de erro padronizadas para limites de plano
 */
export const PLANO_LIMIT_ERRORS = {
  LIMITE_USUARIOS_INDIVIDUAL:
    "Limite do plano atingido: apenas 1 usuário permitido. Faça upgrade para o plano Empresa para mais usuários.",
  LIMITE_USUARIOS_EMPRESA:
    "Limite de usuários do plano atingido. Contrate mais usuários extras ou altere o plano.",
  USUARIOS_EXTRAS_APENAS_EMPRESA:
    "Usuários extras só são permitidos no plano Empresa. Selecione o plano Empresa ou defina usuários extras como 0.",
  PLANO_INATIVO: "O plano selecionado não está ativo.",
  PLANO_NAO_ENCONTRADO: (id: string) => `Plano com ID ${id} não encontrado`,
  EMPRESA_NAO_ENCONTRADA: (id: string) => `Empresa com ID ${id} não encontrada`,
} as const;

/**
 * Validador de limites de plano (empresas e usuários).
 * Usado antes de criar empresa ou usuário para garantir que os limites do plano não sejam excedidos.
 */
@Injectable()
export class PlanoLimitValidator {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Valida se a empresa pode adicionar mais um usuário.
   * @throws BadRequestException com mensagem clara se o limite foi atingido
   */
  async validateLimiteUsuarios(empresaId: string): Promise<void> {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      include: { plano: true },
    });

    if (!empresa) {
      throw new NotFoundException(PLANO_LIMIT_ERRORS.EMPRESA_NAO_ENCONTRADA(empresaId));
    }
    if (!empresa.plano) {
      throw new BadRequestException("Empresa sem plano associado");
    }

    const totalPermitido = empresa.plano.maxUsuarios + empresa.usuariosExtrasContratados;
    const count = await this.prisma.user.count({
      where: { empresaId, deletedAt: null },
    });

    if (count >= totalPermitido) {
      const msg =
        empresa.plano.tipo === "EMPRESA"
          ? PLANO_LIMIT_ERRORS.LIMITE_USUARIOS_EMPRESA
          : PLANO_LIMIT_ERRORS.LIMITE_USUARIOS_INDIVIDUAL;
      throw new BadRequestException(msg);
    }
  }

  /**
   * Valida configuração de plano ao criar/atualizar empresa:
   * - plano existe e está ativo
   * - usuariosExtrasContratados > 0 só é permitido no plano EMPRESA
   */
  async validateConfigEmpresa(planoId: string, usuariosExtrasContratados: number): Promise<void> {
    const plano = await this.prisma.plano.findUnique({
      where: { id: planoId },
    });

    if (!plano) {
      throw new NotFoundException(PLANO_LIMIT_ERRORS.PLANO_NAO_ENCONTRADO(planoId));
    }
    if (!plano.ativo) {
      throw new BadRequestException(PLANO_LIMIT_ERRORS.PLANO_INATIVO);
    }
    if (usuariosExtrasContratados > 0 && plano.tipo !== "EMPRESA") {
      throw new BadRequestException(PLANO_LIMIT_ERRORS.USUARIOS_EXTRAS_APENAS_EMPRESA);
    }
  }
}
