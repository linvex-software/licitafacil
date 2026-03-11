import { EventoDisputa } from "@prisma/client";

export interface DisputaEventoPayload {
  disputaId: string;
  itemNumero?: number;
  evento: EventoDisputa;
  valorEnviado?: number;
  melhorLance?: number;
  posicao?: number;
  detalhe?: string;
  timestamp: Date;
}
