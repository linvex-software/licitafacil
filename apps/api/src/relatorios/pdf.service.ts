import { Injectable, Logger } from "@nestjs/common";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { RelatorioResponseDto } from "./dto/relatorio-response.dto";

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async gerarPdf(
    dados: RelatorioResponseDto,
    nomeEmpresa: string,
  ): Promise<Buffer> {
    const inicio = Date.now();
    this.logger.log("Iniciando gera\u00e7\u00e3o de PDF...");

    const html = this.montarHtml(dados, nomeEmpresa);

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });

      const pdf = await page.pdf({
        format: "A4",
        margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
        printBackground: true,
      });

      const tempo = ((Date.now() - inicio) / 1000).toFixed(1);
      this.logger.log(`PDF gerado em ${tempo}s`);

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  private getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      PARTICIPANDO: "Participando",
      ANALISANDO: "Analisando",
      VENCIDA: "Vencida",
      PERDIDA: "Perdida",
      DESCARTADA: "Descartada",
      AGUARDANDO_RESULTADO: "Aguard. Resultado",
    };
    return map[status] || status;
  }

  private getStatusColor(status: string): string {
    const map: Record<string, string> = {
      VENCIDA: "#16a34a",
      PARTICIPANDO: "#2563eb",
      ANALISANDO: "#d97706",
      PERDIDA: "#dc2626",
      DESCARTADA: "#6b7280",
    };
    return map[status] || "#6b7280";
  }

  private montarHtml(
    dados: RelatorioResponseDto,
    nomeEmpresa: string,
  ): string {
    const dataGeracao = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const tabelaLinhas = dados.licitacoes
      .map(
        (l) => `
      <tr>
        <td class="objeto">${l.titulo?.substring(0, 60)}${(l.titulo?.length || 0) > 60 ? "..." : ""}</td>
        <td>${l.modalidade?.replace(/_/g, " ")}</td>
        <td>${l.orgao?.substring(0, 30)}</td>
        <td><span class="badge" style="background:${this.getStatusColor(l.status)}20;color:${this.getStatusColor(l.status)}">${this.getStatusLabel(l.status)}</span></td>
        <td>${l.dataCriacao}</td>
      </tr>
    `,
      )
      .join("");

    const statusBars = dados.distribuicaoStatus
      .map(
        (s) => `
      <div class="bar-item">
        <div class="bar-label">
          <span>${this.getStatusLabel(s.status)}</span>
          <span>${s.quantidade} (${s.percentual}%)</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${s.percentual}%;background:${this.getStatusColor(s.status)}"></div>
        </div>
      </div>
    `,
      )
      .join("");

    const modalidadeBars = dados.distribuicaoModalidade
      .map(
        (m) => `
      <div class="bar-item">
        <div class="bar-label">
          <span>${m.modalidade?.replace(/_/g, " ")}</span>
          <span>${m.quantidade} (${m.percentual}%)</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${m.percentual}%;background:#2563eb"></div>
        </div>
      </div>
    `,
      )
      .join("");

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', Arial, Helvetica, sans-serif; color: #1a1a2e; font-size: 11px; }

    .header { background: #1a1a2e; color: white; padding: 24px; margin-bottom: 24px; }
    .header h1 { font-size: 22px; margin-bottom: 4px; }
    .header-sub { display: flex; justify-content: space-between; opacity: 0.8; font-size: 10px; margin-top: 8px; }

    .metricas { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .metrica-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; }
    .metrica-valor { font-size: 28px; font-weight: bold; color: #1a1a2e; }
    .metrica-label { font-size: 10px; color: #64748b; margin-top: 4px; }
    .metrica-card.sucesso .metrica-valor { color: #16a34a; }

    .section { margin-bottom: 24px; }
    .section-title { font-size: 14px; font-weight: bold; color: #1a1a2e; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; }

    .graficos { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .grafico-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
    .grafico-title { font-size: 12px; font-weight: bold; margin-bottom: 12px; }

    .bar-item { margin-bottom: 8px; }
    .bar-label { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 3px; color: #475569; }
    .bar-track { background: #e2e8f0; border-radius: 4px; height: 8px; }
    .bar-fill { height: 8px; border-radius: 4px; }

    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #1a1a2e; color: white; padding: 8px 6px; text-align: left; font-size: 10px; }
    td { padding: 7px 6px; border-bottom: 1px solid #f1f5f9; }
    tr:nth-child(even) td { background: #f8fafc; }
    .objeto { max-width: 200px; }
    .badge { padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: bold; }

    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 9px; }

    .resumo-box { background: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; border-radius: 4px; margin-bottom: 24px; }
    .resumo-box p { line-height: 1.8; color: #334155; }
  </style>
</head>
<body>

  <div class="header">
    <h1>Relat&oacute;rio Gerencial de Licita&ccedil;&otilde;es</h1>
    <div style="font-size:14px;opacity:0.9;margin-top:4px">${nomeEmpresa}</div>
    <div class="header-sub">
      <span>Per&iacute;odo: ${dados.periodo.label}</span>
      <span>Gerado em: ${dataGeracao}</span>
    </div>
  </div>

  <div class="metricas">
    <div class="metrica-card">
      <div class="metrica-valor">${dados.metricas.total}</div>
      <div class="metrica-label">Total de Licita&ccedil;&otilde;es</div>
    </div>
    <div class="metrica-card sucesso">
      <div class="metrica-valor">${dados.metricas.ganhas}</div>
      <div class="metrica-label">Licita&ccedil;&otilde;es Vencidas</div>
    </div>
    <div class="metrica-card sucesso">
      <div class="metrica-valor">${dados.metricas.taxaSucesso}%</div>
      <div class="metrica-label">Taxa de Sucesso</div>
    </div>
    <div class="metrica-card">
      <div class="metrica-valor">${dados.metricas.emAndamento}</div>
      <div class="metrica-label">Em Andamento</div>
    </div>
  </div>

  <div class="resumo-box">
    <p>
      No per&iacute;odo analisado, a empresa participou de <strong>${dados.metricas.total} licita&ccedil;&otilde;es</strong>,
      vencendo <strong>${dados.metricas.ganhas}</strong> com uma taxa de sucesso de <strong>${dados.metricas.taxaSucesso}%</strong>.
      Atualmente, <strong>${dados.metricas.emAndamento}</strong> licita&ccedil;&otilde;es est&atilde;o em andamento.
    </p>
  </div>

  <div class="graficos">
    <div class="grafico-card">
      <div class="grafico-title">Distribui&ccedil;&atilde;o por Status</div>
      ${statusBars}
    </div>
    <div class="grafico-card">
      <div class="grafico-title">Distribui&ccedil;&atilde;o por Modalidade</div>
      ${modalidadeBars}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Detalhamento das Licita&ccedil;&otilde;es</div>
    <table>
      <thead>
        <tr>
          <th>Objeto</th>
          <th>Modalidade</th>
          <th>&Oacute;rg&atilde;o</th>
          <th>Status</th>
          <th>Data Cria&ccedil;&atilde;o</th>
        </tr>
      </thead>
      <tbody>
        ${tabelaLinhas}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>LicitaF&aacute;cil &mdash; Plataforma de Gest&atilde;o de Licita&ccedil;&otilde;es &bull; Relat&oacute;rio gerado automaticamente em ${dataGeracao}</p>
    <p>Este documento &eacute; confidencial e destinado exclusivamente ao uso interno.</p>
  </div>

</body>
</html>`;
  }
}
