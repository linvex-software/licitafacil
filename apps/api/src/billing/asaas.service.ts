import { Injectable, Logger } from "@nestjs/common";

/** Campos mínimos das respostas Asaas usadas no checkout */
export interface AsaasCustomerResponse {
  id: string;
}

export interface AsaasPaymentResponse {
  id: string;
  status: string;
  invoiceUrl?: string | null;
  expirationDate?: string | null;
  confirmedDate?: string | null;
}

export interface AsaasPixQrCodeResponse {
  encodedImage: string;
  payload: string;
}

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

    /** Base oficial v3: produção `https://api.asaas.com/v3`, sandbox `https://api-sandbox.asaas.com/v3` (não usar `/api/v3` nem sandbox.asaas.com/api — retorna 404). */
    this.baseUrl = isSandbox
      ? "https://api-sandbox.asaas.com/v3"
      : "https://api.asaas.com/v3";
    this.apiKey = apiKey;

    if (chaveProducao && isSandbox) {
      this.logger.warn(
        "ASAAS_API_KEY é de produção ($aact_prod_) mas o modo sandbox está ativo (ASAAS_SANDBOX=true). Ajuste ASAAS_SANDBOX=false.",
      );
    }
  }

  private parseResponseBody(method: string, path: string, res: Response, rawText: string): unknown {
    const trimmed = rawText.trim();
    if (!trimmed) {
      if (!res.ok) {
        this.logger.error(`Asaas ${method} ${path} HTTP ${res.status} — corpo vazio`);
        throw new Error(`Comunicação com o Asaas falhou (HTTP ${res.status}).`);
      }
      return {};
    }
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      this.logger.error(
        `Asaas ${method} ${path} HTTP ${res.status} — resposta não é JSON (início): ${trimmed.slice(0, 400)}`,
      );
      throw new Error(
        res.ok
          ? "Resposta inválida do serviço de pagamento."
          : `Comunicação com o Asaas falhou (HTTP ${res.status}).`,
      );
    }
  }

  private async request(method: string, path: string, body?: unknown) {
    if (!this.apiKey) {
      throw new Error("ASAAS_API_KEY não configurada");
    }

    const url = `${this.baseUrl}${path}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "LimvexLicitação-API/1.0",
          access_token: this.apiKey,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch (err) {
      this.logger.error(`Asaas ${method} ${path} fetch falhou: ${err instanceof Error ? err.message : err}`);
      throw new Error("Não foi possível conectar ao Asaas. Verifique rede ou firewall.");
    }

    const rawText = await res.text();
    const data = this.parseResponseBody(method, path, res, rawText);

    if (!res.ok) {
      const errBody = data as { errors?: Array<{ description?: string }> };
      const desc = errBody?.errors?.[0]?.description;
      this.logger.error(`Asaas ${method} ${path} failed HTTP ${res.status}: ${JSON.stringify(data)}`);
      throw new Error(desc || `Erro na API Asaas (HTTP ${res.status}).`);
    }
    return data;
  }

  async criarCliente(dados: {
    name: string;
    email: string;
    cpfCnpj: string;
    phone?: string;
  }): Promise<AsaasCustomerResponse> {
    return (await this.request("POST", "/customers", dados)) as AsaasCustomerResponse;
  }

  async criarCobrancaPix(dados: {
    customer: string;
    value: number;
    dueDate: string;
    description: string;
  }): Promise<AsaasPaymentResponse> {
    return (await this.request("POST", "/payments", {
      ...dados,
      billingType: "PIX",
    })) as AsaasPaymentResponse;
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
  }): Promise<AsaasPaymentResponse> {
    return (await this.request("POST", "/payments", {
      ...dados,
      billingType: "CREDIT_CARD",
    })) as AsaasPaymentResponse;
  }

  async buscarPagamento(paymentId: string): Promise<AsaasPaymentResponse> {
    return (await this.request("GET", `/payments/${paymentId}`)) as AsaasPaymentResponse;
  }

  async buscarQrCodePix(paymentId: string): Promise<AsaasPixQrCodeResponse> {
    return (await this.request("GET", `/payments/${paymentId}/pixQrCode`)) as AsaasPixQrCodeResponse;
  }
}
