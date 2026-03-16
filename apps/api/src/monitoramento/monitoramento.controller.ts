import { Controller, Get, Post, Delete, Param, Query, Body, Req, UseGuards } from '@nestjs/common'
import { MonitoramentoService } from './monitoramento.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { FiltrosPregaoDto } from './dto/filtros-pregao.dto'
import { CadastrarPregaoDto } from './dto/cadastrar-pregao.dto'

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

  @Post('pregoes')
  async cadastrar(@Req() req: any, @Body() dto: CadastrarPregaoDto) {
    return this.service.cadastrarPregao(req.user.empresaId, dto)
  }

  @Delete('pregoes/:id')
  async remover(@Req() req: any, @Param('id') id: string) {
    return this.service.removerPregao(id, req.user.empresaId)
  }
}
