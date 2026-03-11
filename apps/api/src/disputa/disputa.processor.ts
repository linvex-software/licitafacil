import { Process, Processor } from "@nestjs/bull";
import { DisputaStatus, EventoDisputa, PortalLicitacao } from "@prisma/client";
import { Job } from "bull";
import { DisputaService } from "./disputa.service";
import { FaseSessao } from "./robos/base-robo";
import { MockRobo } from "./robos/mock.robo";
import { selecionarEstrategia } from "./robos/comprasnet/comprasnet.estrategias";
import { ComprasnetRobo } from "./robos/comprasnet/comprasnet.robo";

@Processor("disputa")
export class DisputaProcessor {
  constructor(private readonly disputaService: DisputaService) {}

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
}
