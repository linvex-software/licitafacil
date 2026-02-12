import { Module } from "@nestjs/common";
import { EmailService } from "./email.service";
import { EmailCronService } from "./email.cron.service";
import { EmailController } from "./email.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [EmailController],
  providers: [EmailService, EmailCronService],
  exports: [EmailService],
})
export class EmailModule {}
