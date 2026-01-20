import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  Req,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response, Request } from "express";
import { DocumentService } from "./document.service";
import { SoftDeleteService } from "../common/services/soft-delete.service";
import { AuditLogService } from "../audit-log/audit-log.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Tenant } from "../common/decorators/tenant.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Audit } from "../audit-log/decorators/audit.decorator";
import { AuditInterceptor } from "../audit-log/interceptors/audit.interceptor";
import {
  createDocumentSchema,
  updateDocumentSchema,
  type Document,
  type User,
  UserRole,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from "@licitafacil/shared";
import * as fs from "fs/promises";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const multer = require("multer");

/**
 * Storage em memória para Multer (arquivos serão processados diretamente do buffer)
 */
const multerStorage = multer.memoryStorage();

/**
 * Filtro de validação de arquivo para Multer
 */
const fileFilter = (_req: any, file: any, callback: any) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
    return callback(
      new BadRequestException(
        `Tipo de arquivo não permitido. Tipos permitidos: ${ALLOWED_MIME_TYPES.join(", ")}`,
      ),
      false,
    );
  }

  if (file.size && file.size > MAX_FILE_SIZE) {
    return callback(
      new BadRequestException(
        `Arquivo muito grande. Tamanho máximo: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      ),
      false,
    );
  }

  callback(null, true);
};

/**
 * Opções de upload do Multer
 */
const multerOptions = {
  storage: multerStorage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
};

/**
 * Controller para gerenciar documentos
 * 
 * Todos os endpoints requerem autenticação e isolamento por tenant
 */
@Controller("documents")
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly softDeleteService: SoftDeleteService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Faz upload de um novo documento
   * POST /documents
   * 
   * Body: multipart/form-data
   * - file: arquivo (obrigatório)
   * - name: nome do documento (obrigatório)
   * - category: categoria do documento (obrigatório)
   * 
   * Permissão: ADMIN e COLABORADOR
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  @UseInterceptors(FileInterceptor("file", multerOptions))
  @Audit({ action: "document.create", resourceType: "Document" })
  async create(
    @UploadedFile() file: any,
    @Body() body: { name?: string; category?: string },
    @Tenant() empresaId: string,
    @CurrentUser() user: User,
    @Req() _request: Request,
  ): Promise<Document> {
    if (!file) {
      throw new BadRequestException("Arquivo é obrigatório");
    }

    // Validar dados de entrada com Zod
    const result = createDocumentSchema.safeParse({
      name: body.name,
      category: body.category,
    });

    if (!result.success) {
      throw new BadRequestException({
        message: "Dados inválidos",
        errors: result.error.errors,
      });
    }

    // Converter arquivo do Multer para interface do serviço
    const uploadedFile = {
      fieldname: file.fieldname,
      originalname: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer,
    };

    const document = await this.documentService.create(
      uploadedFile,
      result.data,
      empresaId,
      user.id,
    );

    // Audit log é registrado automaticamente pelo @Audit decorator
    return document;
  }

  /**
   * Lista documentos com filtros e paginação
   * GET /documents
   * 
   * Query params:
   * - page: número da página (default: 1)
   * - limit: itens por página (default: 20, max: 100)
   * - category: filtrar por categoria
   * - search: buscar por nome
   * 
   * Permissão: ADMIN e COLABORADOR
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async findAll(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("category") category?: string,
    @Query("search") search?: string,
    @Tenant() empresaId?: string,
  ) {
    if (!empresaId) {
      throw new BadRequestException("Empresa não encontrada");
    }

    return this.documentService.findAll({
      empresaId,
      category,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * Busca um documento por ID
   * GET /documents/:id
   * 
   * Permissão: ADMIN e COLABORADOR
   */
  @Get(":id")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async findOne(@Param("id") id: string, @Tenant() empresaId: string): Promise<Document> {
    return this.documentService.findOne(id, empresaId);
  }

  /**
   * Faz download de um documento
   * GET /documents/:id/download
   * 
   * Permissão: ADMIN e COLABORADOR
   */
  @Get(":id/download")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async download(
    @Param("id") id: string,
    @Tenant() empresaId: string,
    @CurrentUser() user: User,
    @Res() res: Response,
    @Req() request: Request,
  ) {
    const document = await this.documentService.findOne(id, empresaId);
    const filePath = await this.documentService.getFilePathForDownload(id, empresaId);

    // Ler arquivo do sistema de arquivos
    const fileBuffer = await fs.readFile(filePath);

    // Registrar download no audit log
    await this.auditLogService.record({
      empresaId,
      userId: user.id,
      action: "document.download",
      resourceType: "Document",
      resourceId: document.id,
      metadata: {
        name: document.name,
        filename: document.filename,
      },
      ip: (request as any).ip || (request as any).connection?.remoteAddress || null,
      userAgent: (request as any).headers?.["user-agent"] || null,
    });

    // Configurar headers de resposta
    res.setHeader("Content-Type", document.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${document.name}"`);
    res.setHeader("Content-Length", document.size);

    // Enviar arquivo
    res.send(fileBuffer);
  }

  /**
   * Atualiza um documento (apenas metadados)
   * PATCH /documents/:id
   * 
   * Permissão: ADMIN e COLABORADOR
   */
  @Patch(":id")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  @Audit({ action: "document.update", captureResourceId: true, resourceType: "Document" })
  async update(
    @Param("id") id: string,
    @Body() body: unknown,
    @Tenant() empresaId: string,
    @CurrentUser() _user: User,
    @Req() _request: Request,
  ): Promise<Document> {
    // Validar dados de entrada com Zod
    const result = updateDocumentSchema.safeParse(body);

    if (!result.success) {
      throw new BadRequestException({
        message: "Dados inválidos",
        errors: result.error.errors,
      });
    }

    return this.documentService.update(id, result.data, empresaId);
  }

  /**
   * Remove um documento (soft delete)
   * DELETE /documents/:id
   * 
   * Permissão: Apenas ADMIN
   */
  @Delete(":id")
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("id") id: string,
    @Tenant() empresaId: string,
    @CurrentUser() user: User,
    @Req() request: Request,
  ): Promise<void> {
    // Validar que o documento existe
    await this.documentService.remove(id, empresaId);

    // Fazer soft delete com auditoria automática
    await this.softDeleteService.delete("document", id, empresaId, user.id, request);
  }

  /**
   * Restaura um documento deletado (soft delete)
   * POST /documents/:id/restore
   * 
   * Permissão: Apenas ADMIN
   */
  @Post(":id/restore")
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  @Audit({ action: "document.restore", captureResourceId: true, resourceType: "Document" })
  async restore(
    @Param("id") id: string,
    @Tenant() empresaId: string,
    @CurrentUser() user: User,
    @Req() request: Request,
  ) {
    await this.softDeleteService.restore("document", id, empresaId, user.id, request);

    return {
      message: "Documento restaurado com sucesso",
      id,
    };
  }
}
