import { EventoDisputa, OrigemLanceHistorico } from "@prisma/client";

export interface DisputaEventoPayload {
  disputaId: string;
  itemNumero?: number;
  evento: EventoDisputa;
  valorEnviado?: number;
  melhorLance?: number;
  posicao?: number;
  detalhe?: string;
  timestamp: Date;
  itemDisputaId?: string | null;
  origem?: OrigemLanceHistorico;
  operadorId?: string | null;
}
