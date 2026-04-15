import { IsEnum } from "class-validator";
import { ClienteStatus } from "@prisma/client";

export class PatchBillingStatusDto {
  @IsEnum(ClienteStatus)
  status!: ClienteStatus;
}

