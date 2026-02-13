import { Module } from "@nestjs/common";
import { ComprasnetController } from "./comprasnet.controller";
import { ComprasnetService } from "./comprasnet.service";
import { ComprasnetScraperService } from "./comprasnet-scraper.service";
import { ComprasnetCronService } from "./comprasnet-cron.service";
import { EmailModule } from "../../email/email.module";

@Module({
  imports: [EmailModule],
  controllers: [ComprasnetController],
  providers: [ComprasnetService, ComprasnetScraperService, ComprasnetCronService],
  exports: [ComprasnetService],
})
export class ComprasnetModule {}
