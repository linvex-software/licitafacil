import { IsEnum } from "class-validator";
import { PlanoTipo } from "@prisma/client";

export class PatchBillingPlanDto {
  @IsEnum(PlanoTipo)
  plano!: PlanoTipo;
}

