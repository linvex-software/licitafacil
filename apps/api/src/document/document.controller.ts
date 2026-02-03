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
import { AssinaturaAtivaGuard } from "../assinatura/assinatura.guard";
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
  type UpdateDocumentInput,
  type User,
  UserRole,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  DocumentCategory,
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
@UseGuards(JwtAuthGuard, AssinaturaAtivaGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly softDeleteService: SoftDeleteService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Faz upload de um novo documento ou cria nova versão
   * POST /documents
   *
   * Body: multipart/form-data
   * - file: arquivo (obrigatório)
   * - name: nome do documento (obrigatório, apenas para novo documento)
   * - category: categoria do documento (obrigatório, apenas para novo documento)
   * - documentId: ID do documento existente (opcional, se fornecido cria nova versão)
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
    @Body() body: {
      name?: string;
      category?: string;
      documentId?: string;
      bidId?: string; // Opcional: vincular a uma licitação
      doesExpire?: string | boolean; // string (form-data) ou boolean
      issuedAt?: string;
      expiresAt?: string;
    },
    @Tenant() empresaId: string,
    @CurrentUser() user: User,
    @Req() _request: Request,
  ): Promise<Document> {
    if (!file) {
      throw new BadRequestException("Arquivo é obrigatório");
    }

    // Se documentId foi fornecido, criar nova versão (não precisa validar name/category)
    if (body.documentId) {
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
        { name: "temp", category: DocumentCategory.OUTROS }, // Não usado quando documentId é fornecido
        empresaId,
        user.id,
        body.documentId,
      );

      return document;
    }

    // Preparar dados de validade (converter string para boolean se necessário)
    const validityData: {
      doesExpire?: boolean;
      issuedAt?: string | null;
      expiresAt?: string | null;
    } = {};

    if (body.doesExpire !== undefined) {
      // body.doesExpire pode ser string (form-data) ou boolean
      const doesExpireValue = body.doesExpire;
      validityData.doesExpire =
        doesExpireValue === "true" ||
        doesExpireValue === true ||
        doesExpireValue === "1" ||
        (typeof doesExpireValue === "string" && doesExpireValue.toLowerCase() === "true");
    }

    if (body.issuedAt !== undefined) {
      validityData.issuedAt = body.issuedAt || null;
    }

    if (body.expiresAt !== undefined) {
      validityData.expiresAt = body.expiresAt || null;
    }

    // Validar dados de entrada com Zod (apenas para novo documento)
    const result = createDocumentSchema.safeParse({
      name: body.name,
      category: body.category,
      bidId: body.bidId || undefined, // Incluir bidId se fornecido
      ...validityData,
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
   * - bidId: filtrar por licitação específica
   * - category: filtrar por categoria
   * - search: buscar por nome
   * - status: filtrar por status de validade (VALID, EXPIRING_SOON, EXPIRED, NO_EXPIRATION)
   * - expiresBefore: filtrar documentos que expiram antes desta data (ISO datetime)
   * - expiresAfter: filtrar documentos que expiram depois desta data (ISO datetime)
   * - expiringDays: filtrar documentos expirando em até N dias
   *
   * Permissão: ADMIN e COLABORADOR
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async findAll(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("bidId") bidId?: string,
    @Query("category") category?: string,
    @Query("search") search?: string,
    @Query("status") status?: "VALID" | "EXPIRING_SOON" | "EXPIRED" | "NO_EXPIRATION",
    @Query("expiresBefore") expiresBefore?: string,
    @Query("expiresAfter") expiresAfter?: string,
    @Query("expiringDays") expiringDays?: string,
    @Tenant() empresaId?: string,
  ) {
    if (!empresaId) {
      throw new BadRequestException("Empresa não encontrada");
    }

    return this.documentService.findAll({
      empresaId,
      bidId,
      category,
      search,
      status,
      expiresBefore,
      expiresAfter,
      expiringDays: expiringDays ? parseInt(expiringDays, 10) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * Lista documentos expirando em até N dias
   * GET /documents/expiring?days=30
   *
   * Query params:
   * - days: número de dias (default: 30)
   *
   * Permissão: ADMIN e COLABORADOR
   */
  @Get("expiring")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async findExpiring(
    @Query("days") days?: string,
    @Tenant() empresaId?: string,
  ) {
    if (!empresaId) {
      throw new BadRequestException("Empresa não encontrada");
    }

    const daysNum = days ? parseInt(days, 10) : 30;
    if (isNaN(daysNum) || daysNum < 1) {
      throw new BadRequestException("days deve ser um número positivo");
    }

    return this.documentService.findExpiring(empresaId, daysNum);
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
   * Atualiza um documento (apenas metadados, incluindo campos de validade)
   * PATCH /documents/:id
   *
   * Campos de validade (doesExpire, issuedAt, expiresAt) são auditados automaticamente
   * quando alterados.
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
    @CurrentUser() user: User,
    @Req() request: Request,
  ): Promise<Document> {
    // Validar dados de entrada com Zod
    const result = updateDocumentSchema.safeParse(body);

    if (!result.success) {
      throw new BadRequestException({
        message: "Dados inválidos",
        errors: result.error.errors,
      });
    }

    // Buscar documento existente para comparar mudanças em validade
    const existingDocument = await this.documentService.findOne(id, empresaId);

    // Atualizar documento
    const updatedDocument = await this.documentService.update(id, result.data, empresaId);

    // Registrar audit log específico para mudanças em campos de validade
    // Acessar campos de validade do patch (podem estar undefined)
    const patchData = result.data as UpdateDocumentInput & {
      doesExpire?: boolean;
      issuedAt?: string | null;
      expiresAt?: string | null;
    };

    const validityFieldsChanged =
      (patchData.doesExpire !== undefined && patchData.doesExpire !== existingDocument.doesExpire) ||
      (patchData.issuedAt !== undefined && patchData.issuedAt !== existingDocument.issuedAt) ||
      (patchData.expiresAt !== undefined && patchData.expiresAt !== existingDocument.expiresAt);

    if (validityFieldsChanged) {
      await this.auditLogService.record({
        empresaId,
        userId: user.id,
        action: "document.validity.update",
        resourceType: "Document",
        resourceId: id,
        metadata: {
          previous: {
            doesExpire: existingDocument.doesExpire,
            issuedAt: existingDocument.issuedAt,
            expiresAt: existingDocument.expiresAt,
          },
          current: {
            doesExpire: updatedDocument.doesExpire,
            issuedAt: updatedDocument.issuedAt,
            expiresAt: updatedDocument.expiresAt,
          },
        },
        ip: (request as any).ip || (request as any).connection?.remoteAddress || null,
        userAgent: (request as any).headers?.["user-agent"] || null,
      });
    }

    return updatedDocument;
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

  /**
   * Lista todas as versões de um documento
   * GET /documents/:id/versions
   *
   * Permissão: ADMIN e COLABORADOR
   */
  @Get(":id/versions")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async getVersions(@Param("id") id: string, @Tenant() empresaId: string) {
    return this.documentService.getVersions(id, empresaId);
  }

  /**
   * Busca uma versão específica de um documento
   * GET /documents/:id/versions/:versionNumber
   *
   * Permissão: ADMIN e COLABORADOR
   */
  @Get(":id/versions/:versionNumber")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async getVersion(
    @Param("id") id: string,
    @Param("versionNumber") versionNumber: string,
    @Tenant() empresaId: string,
  ) {
    const versionNum = parseInt(versionNumber, 10);
    if (isNaN(versionNum) || versionNum < 1) {
      throw new BadRequestException("Número de versão inválido");
    }
    return this.documentService.getVersion(id, versionNum, empresaId);
  }

  /**
   * Restaura uma versão anterior de um documento
   * POST /documents/:id/versions/:versionNumber/restore
   *
   * Permissão: Apenas ADMIN
   */
  @Post(":id/versions/:versionNumber/restore")
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  @Audit({
    action: "document.version.restore",
    captureResourceId: true,
    resourceType: "DocumentVersion",
  })
  async restoreVersion(
    @Param("id") id: string,
    @Param("versionNumber") versionNumber: string,
    @Tenant() empresaId: string,
    @CurrentUser() user: User,
  ): Promise<Document> {
    const versionNum = parseInt(versionNumber, 10);
    if (isNaN(versionNum) || versionNum < 1) {
      throw new BadRequestException("Número de versão inválido");
    }
    return this.documentService.restoreVersion(id, versionNum, empresaId, user.id);
  }

  /**
   * Vincula um documento a uma licitação
   * POST /documents/:id/attach
   *
   * Body:
   * - bidId: ID da licitação para vincular
   *
   * Permissão: ADMIN e COLABORADOR
   */
  @Post(":id/attach")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  @Audit({ action: "document.attach", captureResourceId: true, resourceType: "Document" })
  async attach(
    @Param("id") id: string,
    @Body() body: { bidId: string },
    @Tenant() empresaId: string,
    @CurrentUser() user: User,
    @Req() request: Request,
  ): Promise<Document> {
    if (!body.bidId) {
      throw new BadRequestException("bidId é obrigatório");
    }

    const document = await this.documentService.attachToBid(id, body.bidId, empresaId);

    // Registrar auditoria específica
    await this.auditLogService.record({
      empresaId,
      userId: user.id,
      action: "document.attach",
      resourceType: "Document",
      resourceId: document.id,
      metadata: {
        bidId: body.bidId,
        documentId: document.id,
        documentName: document.name,
      },
      ip: (request as any).ip || (request as any).connection?.remoteAddress || null,
      userAgent: (request as any).headers?.["user-agent"] || null,
    });

    return document;
  }

  /**
   * Desvincula um documento de uma licitação
   * POST /documents/:id/detach
   *
   * Permissão: ADMIN e COLABORADOR
   */
  @Post(":id/detach")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  @Audit({ action: "document.detach", captureResourceId: true, resourceType: "Document" })
  async detach(
    @Param("id") id: string,
    @Tenant() empresaId: string,
    @CurrentUser() user: User,
    @Req() request: Request,
  ): Promise<Document> {
    // Buscar documento antes de desvincular para registrar bidId anterior no audit
    const documentBefore = await this.documentService.findOne(id, empresaId);

    const document = await this.documentService.detachFromBid(id, empresaId);

    // Registrar auditoria específica
    await this.auditLogService.record({
      empresaId,
      userId: user.id,
      action: "document.detach",
      resourceType: "Document",
      resourceId: document.id,
      metadata: {
        previousBidId: documentBefore.bidId || null,
        documentId: document.id,
        documentName: document.name,
      },
      ip: (request as any).ip || (request as any).connection?.remoteAddress || null,
      userAgent: (request as any).headers?.["user-agent"] || null,
    });

    return document;
  }
}
