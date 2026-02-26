import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { NegociosController } from "./negocios.controller";
import { NegociosService } from "./negocios.service";

@Module({
  imports: [PrismaModule],
  controllers: [NegociosController],
  providers: [NegociosService],
  exports: [NegociosService],
})
export class NegociosModule {}
