import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { AssinaturaStatus, ClienteStatus, FaturaStatus, MetodoPagamento, UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { AsaasService } from "./asaas.service";
import { CHECKOUT_PLANS, type CheckoutCycle, type CheckoutPlanKey } from "./checkout-plans";
import { CheckoutCartaoDto, CheckoutPixDto } from "./dto/checkout.dto";

type StatusPagamento = "CONFIRMED" | "RECEIVED" | "PENDING" | "OVERDUE" | "REFUNDED" | string;

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly asaas: AsaasService,
    private readonly mailService: MailService,
  ) {}

  async processarPix(dto: CheckoutPixDto) {
    try {
      const contexto = this.obterContextoPlano(dto.plan, dto.cycle);
      const asaasCliente = await this.asaas.criarCliente({
        name: dto.name,
        email: dto.email,
        cpfCnpj: this.somenteDigitos(dto.cpfCnpj),
        phone: dto.phone ? this.somenteDigitos(dto.phone) : undefined,
      });

      const clienteAsaas = await this.prisma.clienteAsaas.upsert({
        where: { asaasCustomerId: asaasCliente.id },
        update: {
          nome: dto.name,
          email: dto.email,
          cpfCnpj: this.somenteDigitos(dto.cpfCnpj),
          telefone: dto.phone ? this.somenteDigitos(dto.phone) : null,
        },
        create: {
          asaasCustomerId: asaasCliente.id,
          nome: dto.name,
          email: dto.email,
          cpfCnpj: this.somenteDigitos(dto.cpfCnpj),
          telefone: dto.phone ? this.somenteDigitos(dto.phone) : null,
        },
      });

      const assinatura = await this.prisma.assinatura.create({
        data: {
          plano: contexto.plan.enum,
          ciclo: contexto.cycleDb,
          valorMensal: contexto.price.monthly,
          valorTotal: contexto.price.total,
          clienteAsaasId: clienteAsaas.id,
        },
      });

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 1);

      const pagamento = await this.asaas.criarCobrancaPix({
        customer: asaasCliente.id,
        value: contexto.price.total,
        dueDate: dueDate.toISOString().split("T")[0],
        description: `Limvex Licitação - Plano ${contexto.plan.name} (${contexto.price.months} meses)`,
      });

      const qrCode = await this.asaas.buscarQrCodePix(pagamento.id);

      await this.prisma.fatura.create({
        data: {
          asaasPaymentId: pagamento.id,
          valor: contexto.price.total,
          status: FaturaStatus.PENDING,
          metodo: MetodoPagamento.PIX,
          dataVencimento: dueDate,
          pixQrCode: qrCode.encodedImage,
          pixCopiaECola: qrCode.payload,
          invoiceUrl: pagamento.invoiceUrl ?? null,
          assinaturaId: assinatura.id,
        },
      });

      return {
        paymentId: pagamento.id,
        pixQrCode: qrCode.encodedImage,
        pixCopiaECola: qrCode.payload,
        expirationDate: pagamento.expirationDate ?? dueDate.toISOString(),
        assinaturaId: assinatura.id,
      };
    } catch (err: unknown) {
      if (err instanceof BadRequestException || err instanceof ConflictException) {
        throw err;
      }
      this.logger.error(
        `processarPix: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
      const raw = err instanceof Error ? err.message : "Erro desconhecido";
      const safe = /ASAAS_API_KEY|não configurada/i.test(raw)
        ? "Pagamentos temporariamente indisponíveis. Tente mais tarde."
        : raw.length > 400
          ? `${raw.slice(0, 400)}…`
          : raw;
      throw new BadRequestException(safe || "Não foi possível gerar o Pix.");
    }
  }

  async processarCartao(dto: CheckoutCartaoDto, remoteIp?: string) {
    try {
      const contexto = this.obterContextoPlano(dto.plan, dto.cycle);
      const asaasCliente = await this.asaas.criarCliente({
        name: dto.name,
        email: dto.email,
        cpfCnpj: this.somenteDigitos(dto.cpfCnpj),
        phone: dto.phone ? this.somenteDigitos(dto.phone) : undefined,
      });

      const clienteAsaas = await this.prisma.clienteAsaas.upsert({
        where: { asaasCustomerId: asaasCliente.id },
        update: {
          nome: dto.name,
          email: dto.email,
          cpfCnpj: this.somenteDigitos(dto.cpfCnpj),
          telefone: dto.phone ? this.somenteDigitos(dto.phone) : null,
        },
        create: {
          asaasCustomerId: asaasCliente.id,
          nome: dto.name,
          email: dto.email,
          cpfCnpj: this.somenteDigitos(dto.cpfCnpj),
          telefone: dto.phone ? this.somenteDigitos(dto.phone) : null,
        },
      });

      const assinatura = await this.prisma.assinatura.create({
        data: {
          plano: contexto.plan.enum,
          ciclo: contexto.cycleDb,
          valorMensal: contexto.price.monthly,
          valorTotal: contexto.price.total,
          clienteAsaasId: clienteAsaas.id,
        },
      });

      const dueDate = new Date().toISOString().split("T")[0];
      const pagamento = await this.asaas.criarCobrancaCartao({
        customer: asaasCliente.id,
        value: contexto.price.total,
        dueDate,
        description: `Limvex Licitação - Plano ${contexto.plan.name}`,
        creditCard: dto.creditCard,
        creditCardHolderInfo: {
          ...dto.creditCardHolderInfo,
          cpfCnpj: this.somenteDigitos(dto.creditCardHolderInfo.cpfCnpj),
          postalCode: this.somenteDigitos(dto.creditCardHolderInfo.postalCode),
          phone: this.somenteDigitos(dto.creditCardHolderInfo.phone),
        },
        remoteIp,
      });

      const pagamentoConfirmado = this.statusEstaConfirmado(pagamento.status);

      await this.prisma.fatura.create({
        data: {
          asaasPaymentId: pagamento.id,
          valor: contexto.price.total,
          status: pagamentoConfirmado ? FaturaStatus.CONFIRMED : FaturaStatus.PENDING,
          metodo: MetodoPagamento.CREDIT_CARD,
          dataPagamento: pagamentoConfirmado ? new Date() : null,
          invoiceUrl: pagamento.invoiceUrl ?? null,
          assinaturaId: assinatura.id,
        },
      });

      if (pagamentoConfirmado) {
        await this.prisma.assinatura.update({
          where: { id: assinatura.id },
          data: { status: AssinaturaStatus.ACTIVE },
        });
        await this.provisionarConta(assinatura.id);
      }

      return {
        paymentId: pagamento.id,
        status: pagamento.status,
        assinaturaId: assinatura.id,
      };
    } catch (err: unknown) {
      if (err instanceof BadRequestException || err instanceof ConflictException) {
        throw err;
      }
      this.logger.error(
        `processarCartao: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
      const raw = err instanceof Error ? err.message : "Erro desconhecido";
      const safe = /ASAAS_API_KEY|não configurada/i.test(raw)
        ? "Pagamentos temporariamente indisponíveis. Tente mais tarde."
        : raw.length > 400
          ? `${raw.slice(0, 400)}…`
          : raw;
      throw new BadRequestException(safe || "Não foi possível processar o cartão.");
    }
  }

  async buscarStatus(paymentId: string) {
    const pagamento = await this.asaas.buscarPagamento(paymentId);
    return {
      status: pagamento.status as StatusPagamento,
      confirmedDate: pagamento.confirmedDate ?? null,
      invoiceUrl: pagamento.invoiceUrl ?? null,
    };
  }

  async provisionarConta(assinaturaId: string) {
    const assinatura = await this.prisma.assinatura.findUnique({
      where: { id: assinaturaId },
      include: { clienteAsaas: true },
    });

    if (!assinatura || assinatura.empresaId) {
      return;
    }

    const emailJaExiste = await this.prisma.user.findUnique({
      where: { email: assinatura.clienteAsaas.email },
    });
    if (emailJaExiste) {
      throw new ConflictException("Já existe um usuário com este e-mail no sistema");
    }

    const senhaGerada = this.gerarSenha();
    const senhaHash = await bcrypt.hash(senhaGerada, 10);

    const resultado = await this.prisma.$transaction(async (tx) => {
      const empresa = await tx.empresa.create({
        data: {
          name: assinatura.clienteAsaas.nome,
        },
      });

      const cpfCnpj = this.somenteDigitos(assinatura.clienteAsaas.cpfCnpj);
      const now = new Date();
      const proximaCobranca = new Date(now);
      proximaCobranca.setMonth(
        proximaCobranca.getMonth() + (assinatura.ciclo === "ANNUAL" ? 12 : 6),
      );

      await tx.clienteConfig.create({
        data: {
          empresaId: empresa.id,
          cnpj: cpfCnpj,
          email: assinatura.clienteAsaas.email,
          telefone: assinatura.clienteAsaas.telefone ?? null,
          plano: assinatura.plano,
          valorSetup: 0,
          mensalidade: assinatura.valorMensal,
          dataInicio: now,
          dataProximaCobranca: proximaCobranca,
          status: ClienteStatus.ATIVO,
          maxUsuarios: 999999,
          maxStorageGB: 999999,
          maxLicitacoesMes: 999999,
          maxAnalisesMes: 999999,
        },
      });

      await tx.user.create({
        data: {
          name: assinatura.clienteAsaas.nome,
          email: assinatura.clienteAsaas.email,
          password: senhaHash,
          role: UserRole.ADMIN,
          empresaId: empresa.id,
        },
      });

      await tx.assinatura.update({
        where: { id: assinaturaId },
        data: { empresaId: empresa.id, status: AssinaturaStatus.ACTIVE },
      });

      await tx.clienteAsaas.update({
        where: { id: assinatura.clienteAsaasId },
        data: { empresaId: empresa.id },
      });

      return empresa;
    });

    await this.mailService.enviarBoasVindas({
      nomeEmpresa: assinatura.clienteAsaas.nome,
      emailAdmin: assinatura.clienteAsaas.email,
      senhaTemp: senhaGerada,
      urlSistema: process.env.FRONTEND_URL || "http://localhost:3000",
    });

    this.logger.log(
      `Conta provisionada para ${assinatura.clienteAsaas.email} — empresa ${resultado.id}`,
    );
  }

  private obterContextoPlano(plan: CheckoutPlanKey, cycle: CheckoutCycle) {
    const planData = CHECKOUT_PLANS[plan];
    if (!planData) {
      throw new BadRequestException("Plano inválido");
    }
    const price = planData.prices[cycle];
    if (!price) {
      throw new BadRequestException("Ciclo inválido");
    }
    return {
      plan: planData,
      price,
      cycleDb: cycle === "annual" ? "ANNUAL" : "SEMIANNUAL",
    } as const;
  }

  private statusEstaConfirmado(status: string) {
    return status === "CONFIRMED" || status === "RECEIVED";
  }

  private somenteDigitos(value: string) {
    return value.replace(/\D/g, "");
  }

  private gerarSenha(): string {
    const base = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!";
    const bytes = randomBytes(12);
    let senha = "";
    for (let i = 0; i < 12; i++) {
      senha += base[bytes[i] % base.length];
    }
    return senha;
  }
}
