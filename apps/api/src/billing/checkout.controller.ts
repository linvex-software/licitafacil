import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { Public } from "../auth/decorators/public.decorator";
import { CheckoutService } from "./checkout.service";
import { CheckoutCartaoDto, CheckoutPixDto } from "./dto/checkout.dto";

@Controller("checkout")
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Public()
  @Post("pix")
  async checkoutPix(@Body() dto: CheckoutPixDto) {
    return this.checkoutService.processarPix(dto);
  }

  @Public()
  @Post("cartao")
  async checkoutCartao(@Body() dto: CheckoutCartaoDto, @Req() req: Request) {
    const remoteIp = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
      || req.ip
      || "127.0.0.1";
    return this.checkoutService.processarCartao(dto, remoteIp);
  }

  @Public()
  @Get("status/:paymentId")
  async status(@Param("paymentId") paymentId: string) {
    return this.checkoutService.buscarStatus(paymentId);
  }
}
