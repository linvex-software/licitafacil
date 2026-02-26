import { IsString, MaxLength, MinLength } from "class-validator";

export class ChatPerguntaDto {
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  pergunta!: string;
}
