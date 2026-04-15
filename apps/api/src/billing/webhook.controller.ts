import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { AssinaturaStatus, FaturaStatus } from "@prisma/client";
import { Public } from "../auth/decorators/public.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { CheckoutService } from "./checkout.service";

/** Header enviado pelo Asaas com o "Token de autenticação" configurado no painel. */
const ASAAS_WEBHOOK_HEADER = "asaas-access-token";

@Controller()
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly checkoutService: CheckoutService,
  ) {}

  @Post("api/webhooks/asaas")
  @Public()
  @HttpCode(200)
  async handleWebhook(
    @Body() body: unknown,
    @Headers(ASAAS_WEBHOOK_HEADER) accessToken: string | undefined,
  ) {
    const expected = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
    if (expected) {
      const received = accessToken?.trim() ?? "";
      if (received !== expected) {
        this.logger.warn("Webhook Asaas rejeitado: token ausente ou inválido");
        throw new UnauthorizedException();
      }
    }

    const payload = body as { event?: string; payment?: { id?: string } };
    const event = payload?.event;
    const payment = payload?.payment;

    if (!payment?.id) {
      return { received: true };
    }

    const fatura = await this.prisma.fatura.findUnique({
      where: { asaasPaymentId: payment.id },
      include: { assinatura: true },
    });

    if (!fatura) {
      this.logger.warn(`Fatura não encontrada para payment ${payment.id}`);
      return { received: true };
    }

    switch (event) {
      case "PAYMENT_CONFIRMED":
      case "PAYMENT_RECEIVED":
        await this.prisma.fatura.update({
          where: { id: fatura.id },
          data: {
            status: event === "PAYMENT_RECEIVED" ? FaturaStatus.RECEIVED : FaturaStatus.CONFIRMED,
            dataPagamento: new Date(),
          },
        });
        await this.prisma.assinatura.update({
          where: { id: fatura.assinaturaId },
          data: { status: AssinaturaStatus.ACTIVE },
        });
        if (!fatura.assinatura.empresaId) {
          await this.checkoutService.provisionarConta(fatura.assinaturaId);
        }
        break;
      case "PAYMENT_OVERDUE":
        await this.prisma.fatura.update({
          where: { id: fatura.id },
          data: { status: FaturaStatus.OVERDUE },
        });
        await this.prisma.assinatura.update({
          where: { id: fatura.assinaturaId },
          data: { status: AssinaturaStatus.OVERDUE },
        });
        break;
      case "PAYMENT_REFUNDED":
        await this.prisma.fatura.update({
          where: { id: fatura.id },
          data: { status: FaturaStatus.REFUNDED },
        });
        await this.prisma.assinatura.update({
          where: { id: fatura.assinaturaId },
          data: { status: AssinaturaStatus.CANCELLED },
        });
        break;
      case "PAYMENT_DELETED":
      case "PAYMENT_CANCELED":
        await this.prisma.fatura.update({
          where: { id: fatura.id },
          data: { status: FaturaStatus.CANCELLED },
        });
        await this.prisma.assinatura.update({
          where: { id: fatura.assinaturaId },
          data: { status: AssinaturaStatus.CANCELLED },
        });
        break;
      default:
        break;
    }

    return { received: true };
  }
}
