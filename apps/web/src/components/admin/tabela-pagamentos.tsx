"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/Badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

interface Pagamento {
  id: string;
  tipo: string;
  valor: string | number;
  dataPrevista: string;
  dataPago: string | null;
  metodoPagamento: string | null;
  observacoes: string | null;
}

interface TabelaPagamentosProps {
  pagamentos: Pagamento[];
}

const tipoLabel: Record<string, string> = {
  SETUP: "Setup",
  MENSALIDADE: "Mensalidade",
  EXTRA: "Extra",
};

const tipoCor: Record<string, string> = {
  SETUP: "bg-blue-100 text-blue-800 border-blue-200",
  MENSALIDADE: "bg-purple-100 text-purple-800 border-purple-200",
  EXTRA: "bg-orange-100 text-orange-800 border-orange-200",
};

export function TabelaPagamentos({ pagamentos }: TabelaPagamentosProps) {
  if (!pagamentos || pagamentos.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Nenhum pagamento registrado ainda.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tipo</TableHead>
          <TableHead>Valor</TableHead>
          <TableHead>Previsto</TableHead>
          <TableHead>Pago</TableHead>
          <TableHead>Método</TableHead>
          <TableHead>Observações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pagamentos.map((pag) => (
          <TableRow key={pag.id}>
            <TableCell>
              <Badge variant="outline" className={tipoCor[pag.tipo] || ""}>
                {tipoLabel[pag.tipo] || pag.tipo}
              </Badge>
            </TableCell>
            <TableCell className="font-medium">
              R$ {parseFloat(String(pag.valor)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </TableCell>
            <TableCell>
              {format(new Date(pag.dataPrevista), "dd/MM/yyyy", {
                locale: ptBR,
              })}
            </TableCell>
            <TableCell>
              {pag.dataPago ? (
                <span className="text-green-600 font-medium">
                  {format(new Date(pag.dataPago), "dd/MM/yyyy", {
                    locale: ptBR,
                  })}
                </span>
              ) : (
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  Pendente
                </Badge>
              )}
            </TableCell>
            <TableCell>{pag.metodoPagamento || "-"}</TableCell>
            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
              {pag.observacoes || "-"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
