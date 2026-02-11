import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminCronService } from "./admin.cron.service";
import { PrismaModule } from "../prisma/prisma.module";
import { MailModule } from "../mail/mail.module";
import { AuditLogModule } from "../audit-log/audit-log.module";

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, MailModule, AuditLogModule],
  controllers: [AdminController],
  providers: [AdminService, AdminCronService],
})
export class AdminModule {}
