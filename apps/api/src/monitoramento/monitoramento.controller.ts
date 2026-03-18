import { Controller, Get, Post, Patch, Delete, Param, Query, Body, Req, UseGuards, Header } from '@nestjs/common'
import { MonitoramentoService } from './monitoramento.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { FiltrosPregaoDto } from './dto/filtros-pregao.dto'
import { CadastrarPregaoDto } from './dto/cadastrar-pregao.dto'
import { AtualizarPregaoDto } from './dto/atualizar-pregao.dto'
import { RegistrarResultadoPregaoDto } from './dto/registrar-resultado-pregao.dto'
import { FiltrosCentralPregoesDto } from './dto/filtros-central-pregoes.dto'

@Controller('monitoramento')
@UseGuards(JwtAuthGuard)
export class MonitoramentoController {
  constructor(private service: MonitoramentoService) {}

  @Get('pregoes')
  async listar(@Req() req: any, @Query() filtros: FiltrosPregaoDto) {
    return this.service.listarPregoes(req.user.empresaId, filtros)
  }

  @Get('pregoes/pncp')
  async buscarPncp(@Query('data') data?: string) {
    const dataAlvo = data ? new Date(data) : new Date()
    return this.service.buscarPregoesPncp(dataAlvo)
  }

  @Get('sugestoes-vinculo')
  async sugestoesVinculo(@Req() req: any, @Query('numero') numero?: string, @Query('q') q?: string) {
    return this.service.sugestoesVinculo(req.user.empresaId, (q ?? numero ?? '').toString())
  }

  @Post('pregoes')
  async cadastrar(@Req() req: any, @Body() dto: CadastrarPregaoDto) {
    return this.service.cadastrarPregao(req.user.empresaId, dto)
  }

  // Central de Pregões (resultados)
  @Get('pregoes/resultados')
  async listarResultados(@Req() req: any, @Query() filtros: FiltrosCentralPregoesDto) {
    return this.service.listarResultadosPregoes(req.user.empresaId, filtros)
  }

  @Get('pregoes/metricas')
  async metricas(@Req() req: any, @Query() filtros: FiltrosCentralPregoesDto) {
    return this.service.metricasPregoes(req.user.empresaId, filtros)
  }

  @Get('pregoes/exportar-csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="pregoes.csv"')
  async exportarCsv(@Req() req: any, @Query() filtros: FiltrosCentralPregoesDto) {
    return this.service.exportarResultadosCsv(req.user.empresaId, filtros)
  }

  @Patch('pregoes/:id/resultado')
  async registrarResultado(@Req() req: any, @Param('id') id: string, @Body() dto: RegistrarResultadoPregaoDto) {
    return this.service.registrarResultadoPregao(id, req.user.empresaId, dto)
  }

  @Patch('pregoes/:id')
  async atualizar(@Req() req: any, @Param('id') id: string, @Body() dto: AtualizarPregaoDto) {
    return this.service.atualizarPregao(id, req.user.empresaId, dto)
  }

  @Delete('pregoes/:id')
  async remover(@Req() req: any, @Param('id') id: string) {
    return this.service.removerPregao(id, req.user.empresaId)
  }
}
