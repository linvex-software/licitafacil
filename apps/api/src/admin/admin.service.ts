import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { AuditLogService } from "../audit-log/audit-log.service";
import {
  CriarClienteDto,
  ListarClientesDto,
  CriarContratoDto,
  RegistrarPagamentoDto,
} from "./dto";
import { PlanoTipo, ClienteStatus, UserRole, TipoPagamento } from "@prisma/client";
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
   * Retorna limites padrão — plano único high-ticket, sem restrições.
   * Mantém a assinatura para compatibilidade com o fluxo de criação de clientes.
   */
  private definirLimitesPorPlano(
    _plano: PlanoTipo,
    _custom?: {
      maxUsuarios?: number;
      maxStorageGB?: number;
      maxLicitacoesMes?: number;
    },
  ) {
    return {
      maxUsuarios: 999999,
      maxStorageGB: 999999,
      maxLicitacoesMes: 999999,
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

  // ========================================================
  // Uso de Limites
  // ========================================================

  /**
   * Retorna o uso atual de limites do cliente (usuários, licitações, storage)
   */
  async obterUsoCliente(empresaId: string) {
    const config = await this.prisma.clienteConfig.findUnique({
      where: { empresaId },
    });

    if (!config) {
      throw new NotFoundException("Configuração do cliente não encontrada");
    }

    const usuariosAtivos = await this.prisma.user.count({
      where: { empresaId, deletedAt: null },
    });

    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const licitacoesNoMes = await this.prisma.bid.count({
      where: { empresaId, createdAt: { gte: inicioMes }, deletedAt: null },
    });

    const storageAggregate = await this.prisma.document.aggregate({
      where: { empresaId, deletedAt: null },
      _sum: { size: true },
    });

    const storageUsadoGB = (storageAggregate._sum.size || 0) / 1024 ** 3;

    return {
      usuarios: {
        atual: usuariosAtivos,
        limite: config.maxUsuarios,
        percentual:
          config.maxUsuarios > 0
            ? (usuariosAtivos / config.maxUsuarios) * 100
            : 0,
      },
      licitacoes: {
        atual: licitacoesNoMes,
        limite: config.maxLicitacoesMes,
        percentual:
          config.maxLicitacoesMes > 0
            ? (licitacoesNoMes / config.maxLicitacoesMes) * 100
            : 0,
      },
      storage: {
        atualGB: storageUsadoGB,
        limiteGB: config.maxStorageGB,
        percentual:
          config.maxStorageGB > 0
            ? (storageUsadoGB / config.maxStorageGB) * 100
            : 0,
      },
    };
  }

  // ========================================================
  // Faturamento - Contratos
  // ========================================================

  /**
   * Cria um novo contrato para um cliente
   */
  async criarContrato(dto: CriarContratoDto) {
    const proximoVencimento = new Date(dto.dataInicio);
    proximoVencimento.setDate(proximoVencimento.getDate() + 30);

    return this.prisma.contrato.create({
      data: {
        empresaId: dto.empresaId,
        planoNome: dto.planoNome,
        valorSetup: dto.valorSetup,
        valorMensalidade: dto.valorMensalidade,
        dataInicio: new Date(dto.dataInicio),
        proximoVencimento,
        status: dto.status,
        observacoes: dto.observacoes,
      },
      include: { empresa: true },
    });
  }

  /**
   * Obtém contrato de um cliente com histórico de pagamentos
   */
  async obterContrato(empresaId: string) {
    return this.prisma.contrato.findUnique({
      where: { empresaId },
      include: {
        empresa: true,
        pagamentos: { orderBy: { dataPrevista: "desc" } },
      },
    });
  }

  // ========================================================
  // Faturamento - Pagamentos
  // ========================================================

  /**
   * Registra um novo pagamento (manual)
   */
  async registrarPagamento(dto: RegistrarPagamentoDto) {
    const pagamento = await this.prisma.pagamento.create({
      data: {
        contratoId: dto.contratoId,
        tipo: dto.tipo,
        valor: dto.valor,
        dataPrevista: new Date(dto.dataPrevista),
        dataPago: dto.dataPago ? new Date(dto.dataPago) : null,
        metodoPagamento: dto.metodoPagamento,
        comprovanteUrl: dto.comprovanteUrl,
        observacoes: dto.observacoes,
      },
    });

    // Se pago e é mensalidade, atualizar próximo vencimento do contrato
    if (dto.dataPago && dto.tipo === TipoPagamento.MENSALIDADE) {
      const contrato = await this.prisma.contrato.findUnique({
        where: { id: dto.contratoId },
      });

      if (contrato) {
        const novoVencimento = new Date(contrato.proximoVencimento);
        novoVencimento.setDate(novoVencimento.getDate() + 30);

        await this.prisma.contrato.update({
          where: { id: dto.contratoId },
          data: {
            proximoVencimento: novoVencimento,
            status: "ATIVO", // Reativar se estava suspenso
          },
        });
      }
    }

    return pagamento;
  }

  /**
   * Lista pagamentos de um contrato
   */
  async listarPagamentos(contratoId: string) {
    return this.prisma.pagamento.findMany({
      where: { contratoId },
      orderBy: { dataPrevista: "desc" },
    });
  }
}
