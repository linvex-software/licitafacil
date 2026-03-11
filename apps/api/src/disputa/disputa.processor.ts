import { Process, Processor } from "@nestjs/bull";
import { DisputaStatus, EventoDisputa, PortalLicitacao } from "@prisma/client";
import { Job } from "bull";
import { DisputaService } from "./disputa.service";
import { DisputaGateway } from "./disputa.gateway";
import { FaseSessao } from "./robos/base-robo";
import { MockRobo } from "./robos/mock.robo";
import { selecionarEstrategia } from "./robos/comprasnet/comprasnet.estrategias";
import { ComprasnetRobo } from "./robos/comprasnet/comprasnet.robo";

@Processor("disputa")
export class DisputaProcessor {
  constructor(
    private readonly disputaService: DisputaService,
    private readonly disputaGateway: DisputaGateway,
  ) {}

  @Process("iniciar")
  async processarDisputa(job: Job<{ disputaId: string }>) {
    const { disputaId } = job.data;
    const disputa = await this.disputaService.buscarComConfiguracoes(disputaId);
    const usarMock = process.env.DISPUTA_MOCK === "true";

    const robo =
      usarMock
        ? new MockRobo()
        : disputa.portal === PortalLicitacao.COMPRASNET
          ? new ComprasnetRobo()
          : null;

    if (!robo) {
      throw new Error(`Portal ${disputa.portal} não suportado ainda`);
    }

    if (robo instanceof MockRobo) {
      robo.configurarItens(disputa.configuracoes);
    }

    await robo.iniciarBrowser();

    const senha = this.disputaService.descriptografarSenhaInterno(
      disputa.credencial.senhaHash,
    );

    await this.disputaService.atualizarStatus(disputaId, DisputaStatus.INICIANDO);

    try {
      await robo.login(disputa.credencial.cnpj, senha);
      await this.disputaService.emitirEvento(disputaId, EventoDisputa.POSICAO_ATUALIZADA, {
        disputaId,
        evento: EventoDisputa.POSICAO_ATUALIZADA,
        detalhe: "Login realizado com sucesso",
        timestamp: new Date(),
      });

      const numeroEdital = disputa.bidId ?? disputa.id;
      await robo.navegarParaSessao(numeroEdital);

      await this.disputaService.atualizarStatus(disputaId, DisputaStatus.AO_VIVO);

      if (robo instanceof MockRobo) {
        await this.processarDisputaMock(disputaId, robo);
        return;
      }

      let fase = await robo.detectarFaseSessao();
      while (fase === FaseSessao.AGUARDANDO) {
        const disputaAtualizada = await this.disputaService.buscarStatus(disputaId);
        if (disputaAtualizada.status === DisputaStatus.CANCELADA) {
          await robo.encerrar();
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 10000));
        fase = await robo.detectarFaseSessao();
      }

      while (fase === FaseSessao.ABERTA) {
        const disputaAtualizada = await this.disputaService.buscarStatus(disputaId);
        if (disputaAtualizada.status === DisputaStatus.PAUSADA) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          continue;
        }
        if (disputaAtualizada.status === DisputaStatus.CANCELADA) break;

        if (await robo.detectarCaptcha()) {
          await this.disputaService.emitirEvento(disputaId, EventoDisputa.CAPTCHA_DETECTADO, {
            disputaId,
            evento: EventoDisputa.CAPTCHA_DETECTADO,
            detalhe: "CAPTCHA detectado - intervenção manual necessária",
            timestamp: new Date(),
          });
          await new Promise((resolve) => setTimeout(resolve, 30000));
          continue;
        }

        for (const config of disputa.configuracoes.filter((configuracao) => configuracao.ativo)) {
          const melhorLance = await robo.obterMelhorLance(config.itemNumero);
          const posicao = await robo.obterPosicaoAtual(config.itemNumero);
          const tempoRestante = await robo.obterTempoRestante();

          const estrategia = selecionarEstrategia(config.estrategia);
          const proximoLance = estrategia.calcularProximoLance(
            melhorLance,
            posicao,
            config,
            tempoRestante,
          );

          if (proximoLance !== null) {
            const enviado = await robo.enviarLance(proximoLance, config.itemNumero);
            await this.disputaService.emitirEvento(disputaId, EventoDisputa.LANCE_ENVIADO, {
              disputaId,
              evento: EventoDisputa.LANCE_ENVIADO,
              itemNumero: config.itemNumero,
              valorEnviado: enviado ? proximoLance : undefined,
              melhorLance,
              posicao,
              detalhe: enviado ? "Lance enviado" : "Falha ao enviar lance",
              timestamp: new Date(),
            });
          } else {
            await this.disputaService.emitirEvento(
              disputaId,
              EventoDisputa.POSICAO_ATUALIZADA,
              {
                disputaId,
                evento: EventoDisputa.POSICAO_ATUALIZADA,
                itemNumero: config.itemNumero,
                melhorLance,
                posicao,
                timestamp: new Date(),
              },
            );
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 5000));
        fase = await robo.detectarFaseSessao();
      }

      await this.disputaService.encerrarDisputa(disputaId);
      await this.disputaService.emitirEvento(disputaId, EventoDisputa.SESSAO_ENCERRADA, {
        disputaId,
        evento: EventoDisputa.SESSAO_ENCERRADA,
        detalhe: "Sessão encerrada pelo portal",
        timestamp: new Date(),
      });
    } catch (erro) {
      const detalhe = erro instanceof Error ? erro.message : "Falha desconhecida no robô";
      await this.disputaService.emitirEvento(disputaId, EventoDisputa.ERRO, {
        disputaId,
        evento: EventoDisputa.ERRO,
        detalhe,
        timestamp: new Date(),
      });
      await this.disputaService.atualizarStatus(disputaId, DisputaStatus.ERRO);
    } finally {
      await robo.encerrar();
    }
  }

  private async processarDisputaMock(disputaId: string, robo: MockRobo) {
    const espera = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    let fase = await robo.detectarFaseSessao();
    while (fase === FaseSessao.AGUARDANDO) {
      const disputaAtualizada = await this.disputaService.buscarStatus(disputaId);
      if (disputaAtualizada.status === DisputaStatus.CANCELADA) {
        await robo.encerrar();
        return;
      }
      await espera(1000);
      fase = await robo.detectarFaseSessao();
    }

    const inicioSessao = Date.now();
    let ultimoLanceMs = 0;
    let ultimaAlternanciaMs = 0;
    let captchaEmitido = false;
    let captchaAtivoAte = 0;
    let captchaItemId: string | null = null;

    while (fase === FaseSessao.ABERTA) {
      const statusAtual = await this.disputaService.buscarStatus(disputaId);
      if (statusAtual.status === DisputaStatus.CANCELADA) {
        break;
      }

      if (statusAtual.status === DisputaStatus.PAUSADA) {
        this.disputaGateway.server.to(`disputa:${disputaId}`).emit("disputa:status", {
          status: DisputaStatus.PAUSADA,
        });
        await espera(1000);
        fase = await robo.detectarFaseSessao();
        continue;
      }

      const elapsedMs = Date.now() - inicioSessao;

      if (!captchaEmitido && elapsedMs >= 30000) {
        const primeiroItem = robo.listarItens()[0];
        captchaItemId = primeiroItem?.itemId ?? "1";
        captchaEmitido = true;
        captchaAtivoAte = Date.now() + 10000;

        this.disputaGateway.server.to(`disputa:${disputaId}`).emit("disputa:captcha", {
          itemId: captchaItemId,
        });
        this.disputaGateway.server.to(`disputa:${disputaId}`).emit("disputa:evento", {
          tipo: "CAPTCHA_DETECTADO",
          descricao: "CAPTCHA detectado - robo pausado automaticamente",
          itemId: captchaItemId,
          timestamp: new Date().toISOString(),
        });

        await this.disputaService.emitirEvento(disputaId, EventoDisputa.CAPTCHA_DETECTADO, {
          disputaId,
          evento: EventoDisputa.CAPTCHA_DETECTADO,
          detalhe: "CAPTCHA detectado no modo mock",
          timestamp: new Date(),
        });
      }

      if (captchaEmitido && captchaAtivoAte > 0 && Date.now() >= captchaAtivoAte) {
        this.disputaGateway.server.to(`disputa:${disputaId}`).emit("disputa:evento", {
          tipo: "CAPTCHA_RESOLVIDO",
          descricao: "CAPTCHA resolvido automaticamente. Robo retomado.",
          itemId: captchaItemId ?? undefined,
          timestamp: new Date().toISOString(),
        });
        this.disputaGateway.server.to(`disputa:${disputaId}`).emit("disputa:status", {
          status: DisputaStatus.AO_VIVO,
        });

        await this.disputaService.emitirEvento(disputaId, EventoDisputa.RETOMADA, {
          disputaId,
          evento: EventoDisputa.RETOMADA,
          detalhe: "Robo retomado apos resolucao de CAPTCHA no mock",
          timestamp: new Date(),
        });

        captchaAtivoAte = 0;
        captchaItemId = null;
      }

      const emCaptcha = captchaAtivoAte > Date.now();
      if (emCaptcha) {
        await espera(1000);
        fase = await robo.detectarFaseSessao();
        continue;
      }

      if (Date.now() - ultimoLanceMs >= 3000) {
        for (const item of robo.listarItens()) {
          const dadosLance = robo.reduzirLance(item.itemNumero);
          if (!dadosLance) continue;

          this.disputaGateway.server.to(`disputa:${disputaId}`).emit("disputa:evento", {
            tipo: "LANCE_ENVIADO",
            descricao: `Lance enviado para item ${item.itemId}`,
            valor: dadosLance.meuUltimoLance,
            itemId: item.itemId,
            timestamp: new Date().toISOString(),
          });
          this.disputaGateway.server.to(`disputa:${disputaId}`).emit("disputa:posicao", {
            itemId: item.itemId,
            posicao: dadosLance.posicao,
            melhorLance: dadosLance.melhorLance,
            meuUltimoLance: dadosLance.meuUltimoLance,
          });

          await this.disputaService.emitirEvento(disputaId, EventoDisputa.LANCE_ENVIADO, {
            disputaId,
            evento: EventoDisputa.LANCE_ENVIADO,
            itemNumero: item.itemNumero,
            valorEnviado: dadosLance.meuUltimoLance,
            melhorLance: dadosLance.melhorLance,
            posicao: dadosLance.posicao,
            detalhe: "Lance mock enviado",
            timestamp: new Date(),
          });
        }
        ultimoLanceMs = Date.now();
      }

      if (Date.now() - ultimaAlternanciaMs >= 7000) {
        for (const item of robo.listarItens()) {
          const dadosPosicao = robo.alternarPosicao(item.itemNumero);
          if (!dadosPosicao) continue;

          const tipo = dadosPosicao.posicao === 2 ? "SAIU_LIDERANCA" : "ASSUMIU_LIDERANCA";
          const descricao =
            dadosPosicao.posicao === 2
              ? `Item ${item.itemId} saiu da lideranca`
              : `Item ${item.itemId} assumiu a lideranca`;

          this.disputaGateway.server.to(`disputa:${disputaId}`).emit("disputa:evento", {
            tipo,
            descricao,
            itemId: item.itemId,
            timestamp: new Date().toISOString(),
          });
          this.disputaGateway.server.to(`disputa:${disputaId}`).emit("disputa:posicao", {
            itemId: item.itemId,
            posicao: dadosPosicao.posicao,
            melhorLance: dadosPosicao.melhorLance,
            meuUltimoLance: dadosPosicao.meuUltimoLance,
          });
        }
        ultimaAlternanciaMs = Date.now();
      }

      await espera(1000);
      fase = await robo.detectarFaseSessao();
    }

    await this.disputaService.encerrarDisputa(disputaId);
    await this.disputaService.emitirEvento(disputaId, EventoDisputa.SESSAO_ENCERRADA, {
      disputaId,
      evento: EventoDisputa.SESSAO_ENCERRADA,
      detalhe: "Sessao mock encerrada",
      timestamp: new Date(),
    });
  }
}
