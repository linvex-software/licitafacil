import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import type { CheckoutCycle, CheckoutPlanKey } from "../checkout-plans";

class CreditCardDto {
  @IsString()
  @IsNotEmpty()
  holderName!: string;

  @IsString()
  @Matches(/^\d{13,19}$/)
  number!: string;

  @IsString()
  @Matches(/^\d{2}$/)
  expiryMonth!: string;

  @IsString()
  @Matches(/^\d{2,4}$/)
  expiryYear!: string;

  @IsString()
  @Matches(/^\d{3,4}$/)
  ccv!: string;
}

class CreditCardHolderInfoDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Matches(/^\d{11,14}$/)
  cpfCnpj!: string;

  @IsString()
  @Matches(/^\d{8}$/)
  postalCode!: string;

  @IsString()
  @IsNotEmpty()
  addressNumber!: string;

  @IsString()
  @Matches(/^\d{10,11}$/)
  phone!: string;
}

export class CheckoutPixDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Matches(/^\d{11,14}$/)
  cpfCnpj!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{10,11}$/)
  phone?: string;

  @IsIn(["start", "growth", "scale"])
  plan!: CheckoutPlanKey;

  @IsIn(["semiannual", "annual"])
  cycle!: CheckoutCycle;
}

export class CheckoutCartaoDto extends CheckoutPixDto {
  @IsObject()
  @ValidateNested()
  @Type(() => CreditCardDto)
  creditCard!: CreditCardDto;

  @IsObject()
  @ValidateNested()
  @Type(() => CreditCardHolderInfoDto)
  creditCardHolderInfo!: CreditCardHolderInfoDto;
}
