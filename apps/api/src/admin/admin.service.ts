import {
  Injectable,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { AuditLogService } from "../audit-log/audit-log.service";
import { CriarClienteDto, ListarClientesDto } from "./dto";
import { PlanoTipo, ClienteStatus, UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Cria um novo cliente B2B completo:
   * 1. Empresa (tenant)
   * 2. ClienteConfig (billing/plano)
   * 3. User admin inicial
   * 4. Envia email de boas-vindas
   * 5. Registra auditoria
   */
  async criarCliente(dto: CriarClienteDto, superAdminId: string, superAdminEmpresaId: string) {
    // 1. Validar CNPJ único
    const cnpjExiste = await this.prisma.clienteConfig.findUnique({
      where: { cnpj: dto.cnpj },
    });
    if (cnpjExiste) {
      throw new ConflictException("CNPJ já cadastrado no sistema");
    }

    // 2. Validar email do admin único
    const emailExiste = await this.prisma.user.findUnique({
      where: { email: dto.emailAdmin },
    });
    if (emailExiste) {
      throw new ConflictException("Email do administrador já cadastrado");
    }

    // 3. Gerar senha temporária (8 caracteres alfanuméricos)
    const senhaTemp = randomBytes(4).toString("hex"); // 8 chars
    const senhaHash = await bcrypt.hash(senhaTemp, 10);

    // 4. Definir limites baseados no plano (se não informados)
    const limites = this.definirLimitesPorPlano(dto.plano, {
      maxUsuarios: dto.maxUsuarios,
      maxStorageGB: dto.maxStorageGB,
      maxLicitacoesMes: dto.maxLicitacoesMes,
    });

    // 5. Criar tudo em transação atômica
    const resultado = await this.prisma.$transaction(async (tx) => {
      // 5.1. Criar Empresa (tenant)
      const empresa = await tx.empresa.create({
        data: {
          name: dto.nomeEmpresa,
        },
      });

      // 5.2. Criar ClienteConfig (billing/plano)
      const clienteConfig = await tx.clienteConfig.create({
        data: {
          empresaId: empresa.id,
          cnpj: dto.cnpj,
          email: dto.email,
          telefone: dto.telefone,
          responsavelComercial: dto.responsavelComercial,
          plano: dto.plano,
          valorSetup: dto.valorSetup,
          mensalidade: dto.mensalidade,
          dataInicio: new Date(dto.dataInicio),
          dataProximaCobranca: this.calcularProximaCobranca(new Date(dto.dataInicio)),
          status: ClienteStatus.ATIVO,
          ...limites,
        },
      });

      // 5.3. Criar usuário admin do cliente
      const admin = await tx.user.create({
        data: {
          name: dto.nomeAdmin,
          email: dto.emailAdmin,
          password: senhaHash,
          role: UserRole.ADMIN,
          empresaId: empresa.id,
        },
      });

      return { empresa, clienteConfig, admin };
    });

    // 6. Enviar email de boas-vindas (fora da transação, não bloqueia)
    await this.mailService.enviarBoasVindas({
      nomeEmpresa: dto.nomeEmpresa,
      emailAdmin: dto.emailAdmin,
      senhaTemp,
      urlSistema: process.env.FRONTEND_URL || "http://localhost:3000",
    });

    // 7. Registrar auditoria
    try {
      await this.auditLogService.record({
        empresaId: superAdminEmpresaId,
        userId: superAdminId,
        action: "admin.criar_cliente",
        resourceType: "ClienteConfig",
        resourceId: resultado.clienteConfig.id,
        metadata: {
          nomeEmpresa: dto.nomeEmpresa,
          cnpj: dto.cnpj,
          plano: dto.plano,
          emailAdmin: dto.emailAdmin,
        },
      });
    } catch (error) {
      this.logger.warn(`Falha ao registrar auditoria: ${error}`);
      // Não bloquear por falha de auditoria
    }

    return {
      cliente: resultado.clienteConfig,
      empresa: {
        id: resultado.empresa.id,
        name: resultado.empresa.name,
      },
      admin: {
        id: resultado.admin.id,
        email: resultado.admin.email,
        name: resultado.admin.name,
      },
      mensagem: "Cliente criado com sucesso. Email de boas-vindas enviado.",
    };
  }

  /**
   * Lista todos os clientes com filtros opcionais
   */
  async listarClientes(dto: ListarClientesDto) {
    const where: any = {
      deletedAt: null, // Soft delete
    };

    if (dto.status) {
      where.status = dto.status;
    }

    if (dto.busca) {
      where.OR = [
        { empresa: { name: { contains: dto.busca, mode: "insensitive" } } },
        { cnpj: { contains: dto.busca } },
      ];
    }

    // Mapear orderBy do DTO para campos do Prisma
    let orderBy: any = { createdAt: "desc" };
    if (dto.orderBy) {
      const direction = dto.orderDirection || "asc";
      switch (dto.orderBy) {
        case "nomeEmpresa":
          orderBy = { empresa: { name: direction } };
          break;
        case "dataInicio":
          orderBy = { dataInicio: direction };
          break;
        case "mensalidade":
          orderBy = { mensalidade: direction };
          break;
      }
    }

    const clientes = await this.prisma.clienteConfig.findMany({
      where,
      orderBy,
      include: {
        empresa: {
          select: {
            id: true,
            name: true,
            users: {
              where: { deletedAt: null },
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
              },
            },
            _count: {
              select: {
                users: { where: { deletedAt: null } },
                bids: { where: { deletedAt: null } },
              },
            },
          },
        },
      },
    });

    return clientes;
  }

  /**
   * Estatísticas gerais do painel admin (MRR, churn, totais)
   */
  async obterEstatisticas() {
    const [
      totalClientes,
      clientesAtivos,
      clientesSuspensos,
      somaSetup,
      somaMensalidade,
    ] = await Promise.all([
      this.prisma.clienteConfig.count({ where: { deletedAt: null } }),
      this.prisma.clienteConfig.count({
        where: { status: ClienteStatus.ATIVO, deletedAt: null },
      }),
      this.prisma.clienteConfig.count({
        where: { status: ClienteStatus.SUSPENSO, deletedAt: null },
      }),
      this.prisma.clienteConfig.aggregate({
        _sum: { valorSetup: true },
        where: { deletedAt: null },
      }),
      this.prisma.clienteConfig.aggregate({
        _sum: { mensalidade: true },
        where: { status: ClienteStatus.ATIVO, deletedAt: null },
      }),
    ]);

    // Churn: cancelados nos últimos 30 dias
    const hoje = new Date();
    const trintaDiasAtras = new Date(hoje);
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

    const clientesCancelados = await this.prisma.clienteConfig.count({
      where: {
        status: ClienteStatus.CANCELADO,
        updatedAt: { gte: trintaDiasAtras },
      },
    });

    const churnRate =
      totalClientes > 0 ? (clientesCancelados / totalClientes) * 100 : 0;

    return {
      totalClientes,
      clientesAtivos,
      clientesSuspensos,
      mrr: Number(somaMensalidade._sum.mensalidade || 0),
      arr: Number(somaMensalidade._sum.mensalidade || 0) * 12,
      setupTotal: Number(somaSetup._sum.valorSetup || 0),
      churnRate: Number(churnRate.toFixed(2)),
    };
  }

  /**
   * Define limites padrão baseados no plano, permitindo override customizado
   */
  private definirLimitesPorPlano(
    plano: PlanoTipo,
    custom?: {
      maxUsuarios?: number;
      maxStorageGB?: number;
      maxLicitacoesMes?: number;
    },
  ) {
    const defaults: Record<
      PlanoTipo,
      { maxUsuarios: number; maxStorageGB: number; maxLicitacoesMes: number }
    > = {
      STARTER: { maxUsuarios: 10, maxStorageGB: 10, maxLicitacoesMes: 50 },
      PROFESSIONAL: {
        maxUsuarios: 30,
        maxStorageGB: 50,
        maxLicitacoesMes: 999999,
      },
      ENTERPRISE: {
        maxUsuarios: 999999,
        maxStorageGB: 999999,
        maxLicitacoesMes: 999999,
      },
    };

    return {
      maxUsuarios: custom?.maxUsuarios || defaults[plano].maxUsuarios,
      maxStorageGB: custom?.maxStorageGB || defaults[plano].maxStorageGB,
      maxLicitacoesMes:
        custom?.maxLicitacoesMes || defaults[plano].maxLicitacoesMes,
    };
  }

  /**
   * Calcula data da próxima cobrança (30 dias após início)
   */
  private calcularProximaCobranca(dataInicio: Date): Date {
    const proxima = new Date(dataInicio);
    proxima.setMonth(proxima.getMonth() + 1);
    return proxima;
  }
}
