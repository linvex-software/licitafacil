import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { DiariosService } from './diarios.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { BuscarDiariosDto } from './dto/buscar-diarios.dto';

@Controller('integracoes/diarios')
@UseGuards(JwtAuthGuard)
export class DiariosController {
    constructor(private readonly diariosService: DiariosService) { }

    @Post('buscar')
    async buscarLicitacoes(
        @Req() req: any,
        @Body() filters: BuscarDiariosDto,
    ) {
        const empresaId = req.user.empresaId;
        return this.diariosService.buscarLicitacoesDiarios(empresaId, filters);
    }

    @Post('importar')
    async importarLicitacoes(
        @Req() req: any,
        @Body('licitacoes') licitacoes: any[]
    ) {
        const empresaId = req.user.empresaId;
        return this.diariosService.importarLicitacoesDiarios(empresaId, licitacoes);
    }
}
