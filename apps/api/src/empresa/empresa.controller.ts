import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { EmpresaService } from "./empresa.service";
import { createEmpresaSchema, type Empresa } from "@licitafacil/shared";

@Controller("empresas")
export class EmpresaController {
  constructor(private readonly empresaService: EmpresaService) {}

  /**
   * Cria uma nova empresa
   * POST /empresas
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: unknown): Promise<Empresa> {
    // Validar dados de entrada com Zod
    const result = createEmpresaSchema.safeParse(body);

    if (!result.success) {
      throw new BadRequestException({
        message: "Dados inválidos",
        errors: result.error.errors,
      });
    }

    return this.empresaService.create(result.data);
  }

  /**
   * Lista todas as empresas
   * GET /empresas
   */
  @Get()
  async findAll(): Promise<Empresa[]> {
    return this.empresaService.findAll();
  }

  /**
   * Busca uma empresa por ID
   * GET /empresas/:id
   */
  @Get(":id")
  async findOne(@Param("id") id: string): Promise<Empresa> {
    return this.empresaService.findOne(id);
  }
}
