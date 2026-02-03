import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Serviço de assinatura (F8-03).
 * Controla ciclo ativo/vencido/cancelado e valida acesso.
 */
@Injectable()
export class AssinaturaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna a assinatura ativa e não vencida da empresa, se existir.
   * Considera ATIVO e dataVencimento >= hoje.
   */
  async getAssinaturaAtiva(empresaId: string) {
    const now = new Date();
    return this.prisma.assinatura.findFirst({
      where: {
        empresaId,
        status: "ATIVO",
        dataVencimento: { gte: now },
      },
      orderBy: { dataVencimento: "desc" },
      include: { plano: true },
    });
  }

  /**
   * Retorna o status atual da assinatura da empresa (para exibição no front).
   * Inclui a assinatura ativa ou a mais recente (vencida/cancelada).
   */
  async getStatusByEmpresaId(empresaId: string) {
    const ativa = await this.getAssinaturaAtiva(empresaId);
    if (ativa) {
      return {
        status: "ATIVO" as const,
        dataVencimento: ativa.dataVencimento.toISOString(),
        podeAcessar: true,
        assinaturaId: ativa.id,
        planoNome: ativa.plano.nome,
      };
    }
    const ultima = await this.prisma.assinatura.findFirst({
      where: { empresaId },
      orderBy: { dataVencimento: "desc" },
      include: { plano: true },
    });
    if (!ultima) {
      return {
        status: null,
        dataVencimento: null,
        podeAcessar: false,
        assinaturaId: null,
        planoNome: null,
      };
    }
    return {
      status: ultima.status,
      dataVencimento: ultima.dataVencimento.toISOString(),
      podeAcessar: false,
      assinaturaId: ultima.id,
      planoNome: ultima.plano.nome,
    };
  }

  /**
   * Indica se a empresa pode acessar o sistema (assinatura ativa e não vencida).
   */
  async isAssinaturaValida(empresaId: string): Promise<boolean> {
    const ativa = await this.getAssinaturaAtiva(empresaId);
    return !!ativa;
  }
}
