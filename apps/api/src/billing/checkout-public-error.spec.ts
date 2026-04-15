import { mensagemCheckoutParaCliente } from "./checkout-public-error";

describe("mensagemCheckoutParaCliente", () => {
  it("retorna mensagem genérica para erro Prisma de tabela inexistente", () => {
    const raw = `Invalid \`prisma.clienteAsaas.upsert()\` invocation:

The table \`public.clientes_asaas\` does not exist in the current database.`;
    expect(mensagemCheckoutParaCliente(raw)).toBe(
      "Não foi possível concluir o pagamento agora. Tente de novo em alguns minutos ou use outro método. Se precisar de ajuda, fale com o suporte.",
    );
  });

  it("mantém mensagens curtas de negócio do Asaas para o usuário", () => {
    expect(mensagemCheckoutParaCliente("CPF/CNPJ inválido.")).toBe("CPF/CNPJ inválido.");
  });
});
