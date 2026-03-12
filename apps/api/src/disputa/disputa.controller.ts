import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Tenant } from "../common/decorators/tenant.decorator";
import { CreateDisputaDto } from "./dto/create-disputa.dto";
import { UpdateDisputaDto } from "./dto/update-disputa.dto";
import { DisputaService } from "./disputa.service";
import { GetHistoricoDisputaQueryDto } from "./dto/historico-disputa.dto";
import type { Response } from "express";

@UseGuards(JwtAuthGuard)
@Controller("disputa")
export class DisputaController {
  constructor(private readonly disputaService: DisputaService) {}

  @Post()
  async criarDisputa(@Body() dto: CreateDisputaDto, @Tenant() empresaId: string) {
    return this.disputaService.criarDisputa(dto, empresaId);
  }

  @Get()
  async listarDisputas(@Tenant() empresaId: string) {
    return this.disputaService.listarDisputas(empresaId);
  }

  /**
   * Histórico de disputas encerradas 
   * GET /disputa/historico
   */
  @Get("historico")
  async listarHistorico(
    @Tenant() empresaId: string,
    @Query() query: GetHistoricoDisputaQueryDto,
  ) {
    return this.disputaService.listarHistorico(empresaId, query);
  }

  /**
   * Detalhes de uma disputa encerrada 
   * GET /disputa/historico/:id
   */
  @Get("historico/:id")
  async detalheHistorico(@Param("id") id: string, @Tenant() empresaId: string) {
    return this.disputaService.buscarHistoricoDetalhe(id, empresaId);
  }

  /**
   * Exporta PDF do histórico da disputa 
   * GET /disputa/historico/:id/pdf
   */
  @Get("historico/:id/pdf")
  async exportarHistoricoPdf(
    @Param("id") id: string,
    @Tenant() empresaId: string,
    @Res() res: Response,
  ) {
    const { buffer, fileName } = await this.disputaService.gerarHistoricoPdf(id, empresaId);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"${fileName}\"`);
    res.send(buffer);
  }

  @Get(":id")
  async detalheDisputa(@Param("id") id: string, @Tenant() empresaId: string) {
    return this.disputaService.buscarDisputa(id, empresaId);
  }

  @Patch(":id/pausar")
  @UseGuards(JwtAuthGuard)
  pausar(@Param("id") id: string, @Request() req: { user: { empresaId: string } }) {
    return this.disputaService.pausarDisputa(id, req.user.empresaId);
  }

  @Patch(":id/retomar")
  @UseGuards(JwtAuthGuard)
  retomar(@Param("id") id: string, @Request() req: { user: { empresaId: string } }) {
    return this.disputaService.retomarDisputa(id, req.user.empresaId);
  }

  @Patch(":id/encerrar")
  async encerrarDisputa(
    @Param("id") id: string,
    @Tenant() empresaId: string,
    @Body() dto: UpdateDisputaDto,
  ) {
    return this.disputaService.encerrarDisputa(id, empresaId, dto);
  }

  @Delete(":id")
  async cancelarDisputa(@Param("id") id: string, @Tenant() empresaId: string) {
    return this.disputaService.cancelarDisputa(id, empresaId);
  }

  @Patch(":id/lance-manual")
  @UseGuards(JwtAuthGuard)
  async lanceManual(
    @Param("id") id: string,
    @Body() body: { itemNumero: number; valor: number },
    @Request() req: { user: { empresaId: string } },
  ) {
    return this.disputaService.registrarLanceManual(
      id,
      body.itemNumero,
      body.valor,
      req.user.empresaId,
    );
  }
}
