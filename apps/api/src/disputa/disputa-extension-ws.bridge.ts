import { forwardRef, Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { HttpAdapterHost } from "@nestjs/core";
import { type IncomingMessage } from "http";
import { type Socket as NetSocket } from "net";
import { WebSocketServer, type RawData, type WebSocket } from "ws";
import { StatusItemDisputa } from "@prisma/client";
import { DisputaService } from "./disputa.service";

interface JwtPayload {
  sub: string;
  empresaId: string;
}

interface ExtClientMeta {
  empresaId: string;
  userId: string;
  disputas: Set<string>;
}

@Injectable()
export class DisputaExtensionWsBridge implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DisputaExtensionWsBridge.name);
  private wss: WebSocketServer | null = null;
  private readonly clients = new Map<WebSocket, ExtClientMeta>();
  private upgradeHandler:
    | ((request: IncomingMessage, socket: NetSocket, head: Buffer) => void)
    | null = null;

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly jwt: JwtService,
    @Inject(forwardRef(() => DisputaService))
    private readonly disputaService: DisputaService,
  ) {}

  onModuleInit() {
    const httpServer = this.httpAdapterHost.httpAdapter.getHttpServer();
    this.wss = new WebSocketServer({
      noServer: true,
    });

    this.upgradeHandler = (request: IncomingMessage, socket: NetSocket, head: Buffer) => {
      const url = request.url || "";
      if (!(url === "/disputa-ws" || url.startsWith("/disputa-ws?"))) {
        return;
      }
      this.wss?.handleUpgrade(request, socket, head, (ws) => {
        this.wss?.emit("connection", ws, request);
      });
    };
    httpServer.on("upgrade", this.upgradeHandler);

    this.wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
      const token = this.extractToken(req.url);
      if (!token) {
        ws.close(1008, "Token ausente");
        return;
      }

      let payload: JwtPayload;
      try {
        payload = this.jwt.verify<JwtPayload>(token);
      } catch {
        ws.close(1008, "Token inválido");
        return;
      }

      this.clients.set(ws, {
        empresaId: payload.empresaId,
        userId: payload.sub,
        disputas: new Set<string>(),
      });

      ws.on("message", async (message: RawData) => {
        await this.onMessage(ws, String(message));
      });

      ws.on("close", () => {
        this.clients.delete(ws);
      });

      this.safeSend(ws, { evento: "extensao:conectada", dados: { ok: true } });
    });

    this.logger.log("Bridge WS da extensão ativo em /disputa-ws");
  }

  onModuleDestroy() {
    const httpServer = this.httpAdapterHost.httpAdapter.getHttpServer();
    if (this.upgradeHandler) {
      httpServer.off("upgrade", this.upgradeHandler);
      this.upgradeHandler = null;
    }
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    this.clients.clear();
  }

  emitPreencherLance(disputaId: string, empresaId: string, payload: Record<string, unknown>) {
    for (const [ws, meta] of this.clients.entries()) {
      if (meta.empresaId !== empresaId) continue;
      if (meta.disputas.size > 0 && !meta.disputas.has(disputaId)) continue;
      this.safeSend(ws, {
        evento: "extensao:preencher_lance",
        dados: payload,
      });
    }
  }

  private async onMessage(ws: WebSocket, raw: string) {
    const meta = this.clients.get(ws);
    if (!meta) return;

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.safeSend(ws, { evento: "erro", dados: { mensagem: "JSON inválido" } });
      return;
    }

    const evento = parsed?.evento;
    const dados = parsed?.dados ?? {};

    if (evento === "extensao:join") {
      const disputaId = typeof dados.disputaId === "string" ? dados.disputaId : null;
      if (disputaId) {
        meta.disputas.add(disputaId);
        this.safeSend(ws, { evento: "extensao:join_ok", dados: { disputaId } });
      }
      return;
    }

    if (evento === "extensao:snapshot") {
      const disputaId =
        (typeof dados.disputaId === "string" && dados.disputaId) ||
        Array.from(meta.disputas)[0];
      if (!disputaId) {
        this.safeSend(ws, { evento: "erro", dados: { mensagem: "disputaId ausente no snapshot" } });
        return;
      }

      const itensRaw = Array.isArray(dados.itens) ? dados.itens : [];
      const itens = itensRaw.map((item: any, idx: number) => {
        const itemNumero =
          this.toNumber(item?.numeroItem) ??
          this.toNumber(item?.itemNumero) ??
          this.extractNumero(item?.id) ??
          idx + 1;
        const status = this.toStatus(item?.status);
        return {
          numeroItem: itemNumero,
          descricao: typeof item?.descricao === "string" ? item.descricao : undefined,
          melhorLance: this.toNumber(item?.melhorLance) ?? undefined,
          posicaoAtual: this.toNumber(item?.posicaoAtual) ?? undefined,
          status,
          vencedor: typeof item?.vencedor === "string" ? item.vencedor : undefined,
          valorFinal: this.toNumber(item?.valorFinal) ?? undefined,
        };
      });

      try {
        await this.disputaService.aplicarSnapshotExtensao(disputaId, meta.empresaId, {
          disputaId,
          itens,
        });
        this.safeSend(ws, { evento: "extensao:snapshot_ok", dados: { disputaId } });
      } catch (error) {
        this.safeSend(ws, {
          evento: "erro",
          dados: { mensagem: error instanceof Error ? error.message : "Falha ao processar snapshot" },
        });
      }
      return;
    }

    if (evento === "extensao:lance_confirmado") {
      const disputaId =
        (typeof dados.disputaId === "string" && dados.disputaId) ||
        Array.from(meta.disputas)[0];
      const itemNumero = this.toNumber(dados.itemNumero);
      const valor = this.toNumber(dados.valor);
      const posicao = this.toNumber(dados.posicao) ?? undefined;

      if (!disputaId || itemNumero == null || valor == null) {
        this.safeSend(ws, {
          evento: "erro",
          dados: { mensagem: "disputaId, itemNumero e valor obrigatórios em lance_confirmado" },
        });
        return;
      }

      try {
        await this.disputaService.registrarLanceConfirmadoExtensao(disputaId, meta.empresaId, {
          itemNumero,
          valor,
          posicao,
        });
        this.safeSend(ws, { evento: "extensao:lance_confirmado_ok", dados: { disputaId, itemNumero } });
      } catch (error) {
        this.safeSend(ws, {
          evento: "erro",
          dados: { mensagem: error instanceof Error ? error.message : "Falha no lance confirmado" },
        });
      }
    }
  }

  private extractToken(urlRaw?: string | null): string | null {
    if (!urlRaw) return null;
    try {
      const url = new URL(urlRaw, "http://localhost");
      const token = url.searchParams.get("token");
      return token?.trim() || null;
    } catch {
      return null;
    }
  }

  private safeSend(ws: WebSocket, payload: unknown) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  private toNumber(v: unknown): number | null {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim()) {
      const n = Number(v.replace(",", "."));
      if (Number.isFinite(n)) return n;
    }
    return null;
  }

  private extractNumero(v: unknown): number | null {
    if (typeof v !== "string") return null;
    const m = v.match(/\d+/);
    if (!m) return null;
    const n = Number(m[0]);
    return Number.isFinite(n) ? n : null;
  }

  private toStatus(v: unknown): StatusItemDisputa | undefined {
    if (typeof v !== "string") return undefined;
    const up = v.toUpperCase().trim();
    if (up === "AGUARDANDO") return StatusItemDisputa.AGUARDANDO;
    if (up === "ABERTO") return StatusItemDisputa.ABERTO;
    if (up === "ENCERRAMENTO_ALEATORIO") return StatusItemDisputa.ENCERRAMENTO_ALEATORIO;
    if (up === "ENCERRADO") return StatusItemDisputa.ENCERRADO;
    return undefined;
  }
}

