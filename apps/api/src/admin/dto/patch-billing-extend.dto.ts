import { IsDateString } from "class-validator";

export class PatchBillingExtendDto {
  @IsDateString()
  dataProximaCobranca!: string;
}

