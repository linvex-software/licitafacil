import { Module } from "@nestjs/common";
import { MailModule } from "../mail/mail.module";
import { CheckoutController } from "./checkout.controller";
import { WebhookController } from "./webhook.controller";
import { AsaasService } from "./asaas.service";
import { CheckoutService } from "./checkout.service";

@Module({
  imports: [MailModule],
  controllers: [CheckoutController, WebhookController],
  providers: [AsaasService, CheckoutService],
  exports: [AsaasService, CheckoutService],
})
export class BillingModule {}
