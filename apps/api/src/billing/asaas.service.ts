import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class AsaasService {
  private readonly logger = new Logger(AsaasService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    const apiKey = process.env.ASAAS_API_KEY || "";
    const explicitProd = process.env.ASAAS_SANDBOX === "false";
    const explicitSandbox = process.env.ASAAS_SANDBOX === "true";
    /** Chave $aact_prod_* só funciona na API de produção; evita erro "não pertence a este ambiente" se ASAAS_SANDBOX faltar na Railway. */
    const chaveProducao = apiKey.startsWith("$aact_prod_");
    const isSandbox = explicitSandbox ? true : explicitProd ? false : !chaveProducao;

    this.baseUrl = isSandbox
      ? "https://sandbox.asaas.com/api/v3"
      : "https://api.asaas.com/api/v3";
    this.apiKey = apiKey;

    if (chaveProducao && isSandbox) {
      this.logger.warn(
        "ASAAS_API_KEY é de produção ($aact_prod_) mas o modo sandbox está ativo (ASAAS_SANDBOX=true). Ajuste ASAAS_SANDBOX=false.",
      );
    }
  }

  private async request(method: string, path: string, body?: unknown) {
    if (!this.apiKey) {
      throw new Error("ASAAS_API_KEY não configurada");
    }

    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        access_token: this.apiKey,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const data = await res.json();
    if (!res.ok) {
      this.logger.error(`Asaas ${method} ${path} failed: ${JSON.stringify(data)}`);
      throw new Error(data?.errors?.[0]?.description || "Erro na API Asaas");
    }
    return data;
  }

  async criarCliente(dados: {
    name: string;
    email: string;
    cpfCnpj: string;
    phone?: string;
  }) {
    return this.request("POST", "/customers", dados);
  }

  async criarCobrancaPix(dados: {
    customer: string;
    value: number;
    dueDate: string;
    description: string;
  }) {
    return this.request("POST", "/payments", {
      ...dados,
      billingType: "PIX",
    });
  }

  async criarCobrancaCartao(dados: {
    customer: string;
    value: number;
    dueDate: string;
    description: string;
    creditCard: {
      holderName: string;
      number: string;
      expiryMonth: string;
      expiryYear: string;
      ccv: string;
    };
    creditCardHolderInfo: {
      name: string;
      email: string;
      cpfCnpj: string;
      postalCode: string;
      addressNumber: string;
      phone: string;
    };
    remoteIp?: string;
  }) {
    return this.request("POST", "/payments", {
      ...dados,
      billingType: "CREDIT_CARD",
    });
  }

  async buscarPagamento(paymentId: string) {
    return this.request("GET", `/payments/${paymentId}`);
  }

  async buscarQrCodePix(paymentId: string) {
    return this.request("GET", `/payments/${paymentId}/pixQrCode`);
  }
}
