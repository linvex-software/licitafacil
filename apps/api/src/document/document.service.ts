import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { PrismaTenantService } from "../prisma/prisma-tenant.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  type CreateDocumentInput,
  type UpdateDocumentInput,
  type Document,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  documentValiditySchema,
} from "@licitafacil/shared";
import * as fs from "fs/promises";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import {
  computeDocumentValidityStatus,
  daysToExpire,
  getNowUTC,
  type DocumentValidityData,
} from "./document-validity.utils";

/**
 * Interface para filtros de listagem de documentos
 */
export interface ListDocumentsFilters {
  empresaId: string;
  bidId?: string; // Opcional: filtrar por licitação específica
  category?: string;
  search?: string; // Busca por nome
  page?: number;
  limit?: number;
  // Filtros de validade
  status?: "VALID" | "EXPIRING_SOON" | "EXPIRED" | "NO_EXPIRATION";
  expiresBefore?: string; // ISO datetime string
  expiresAfter?: string; // ISO datetime string
  expiringDays?: number; // Documentos expirando em até N dias
}

/**
 * Interface para upload de arquivo
 */
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class DocumentService {
  private readonly uploadsDir: string;

  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly prisma: PrismaService,
  ) {
    // Diretório de uploads: raiz do projeto/apps/api/uploads
    this.uploadsDir = path.join(process.cwd(), "uploads");

    // Criar diretório de uploads se não existir
    this.ensureUploadsDirectory();
  }

  /**
   * Garante que o diretório de uploads existe
   */
  private async ensureUploadsDirectory(): Promise<void> {
    try {
      await fs.access(this.uploadsDir);
    } catch {
      // Diretório não existe, criar
      await fs.mkdir(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Valida o arquivo enviado
   */
  private validateFile(file: UploadedFile): void {
    if (!file) {
      throw new BadRequestException("Arquivo é obrigatório");
    }

    // Validar tipo MIME
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
      throw new BadRequestException(
        `Tipo de arquivo não permitido. Tipos permitidos: ${ALLOWED_MIME_TYPES.join(", ")}`,
      );
    }

    // Validar tamanho
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `Arquivo muito grande. Tamanho máximo: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      );
    }
  }

  /**
   * Gera caminho do arquivo baseado na empresa e data
   */
  private getFilePath(empresaId: string, filename: string): string {
    const now = getNowUTC();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    // Estrutura: uploads/{empresaId}/{ano}/{mes}/{filename}
    const empresaDir = path.join(this.uploadsDir, empresaId, String(year), month);

    return path.join(empresaDir, filename);
  }

  /**
   * Gera URL relativa do arquivo
   */
  private getFileUrl(empresaId: string, filename: string): string {
    const now = getNowUTC();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    // URL relativa: {empresaId}/{ano}/{mes}/{filename}
    return `${empresaId}/${year}/${month}/${filename}`;
  }

  /**
   * Sanitiza o nome do arquivo (remove caracteres perigosos)
   */
  private sanitizeFilename(extension: string): string {
    // Gerar UUID para o nome do arquivo
    const uuid = uuidv4();
    return `${uuid}${extension}`;
  }

  /**
   * Cria um documento virtual "PENDENTE" (sem arquivo associado).
   * Utilizado na auto-importação da análise de edital.
   */
  async createPendente(
    name: string,
    category: string,
    bidId: string,
    empresaId: string,
    userId: string,
  ): Promise<Document> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);

    const document = await prismaWithTenant.document.create({
      data: {
        name,
        filename: "pendente",
        mimeType: "application/octet-stream",
        size: 0,
        category,
        url: "pendente",
        uploadedBy: userId,
        empresaId,
        bidId,
        status: "PENDENTE",
        doesExpire: false,
      },
    });

    return this.mapToDocument(document as any);
  }

  /**
   * Cria um novo documento via upload
   * Se documentId for fornecido, cria uma nova versão do documento existente
   */
  async create(
    file: UploadedFile,
    data: CreateDocumentInput,
    empresaId: string,
    userId: string,
    documentId?: string,
  ): Promise<Document> {
    // Validar arquivo
    this.validateFile(file);

    // Garantir que diretórios existam
    await this.ensureUploadsDirectory();

    // Extrair extensão do arquivo original
    const extension = path.extname(file.originalname);
    const sanitizedFilename = this.sanitizeFilename(extension);

    // Gerar caminho completo do arquivo
    const filePath = this.getFilePath(empresaId, sanitizedFilename);
    const fileUrl = this.getFileUrl(empresaId, sanitizedFilename);

    // Criar diretórios necessários
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Salvar arquivo no sistema de arquivos
    try {
      await fs.writeFile(filePath, file.buffer);
    } catch (error) {
      throw new InternalServerErrorException("Erro ao salvar arquivo no servidor");
    }

    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);

    // Se documentId foi fornecido, criar nova versão
    if (documentId) {
      return this.createNewVersion(documentId, file, sanitizedFilename, fileUrl, empresaId, userId);
    }

    // Preparar dados de validade (com valores padrão seguros)
    // Acessar campos de validade do input (podem estar undefined)
    const inputData = data as CreateDocumentInput & {
      doesExpire?: boolean;
      issuedAt?: string | null;
      expiresAt?: string | null;
    };

    const validityData: {
      doesExpire: boolean;
      issuedAt?: Date | null;
      expiresAt?: Date | null;
    } = {
      doesExpire: inputData.doesExpire ?? false,
    };

    // Se doesExpire=true, validar e converter expiresAt
    if (validityData.doesExpire) {
      if (!inputData.expiresAt) {
        throw new BadRequestException("expiresAt é obrigatório quando doesExpire=true");
      }
      validityData.expiresAt = new Date(inputData.expiresAt);

      // Se issuedAt foi fornecido, converter também
      if (inputData.issuedAt) {
        validityData.issuedAt = new Date(inputData.issuedAt);
      }
    } else {
      // Se doesExpire=false, garantir que expiresAt seja null
      validityData.expiresAt = null;
      validityData.issuedAt = inputData.issuedAt ? new Date(inputData.issuedAt) : null;
    }

    // Caso contrário, criar novo documento com versão 1
    const inputDataWithBid = data as CreateDocumentInput & {
      bidId?: string | null;
    };

    const document = await prismaWithTenant.document.create({
      data: {
        name: data.name,
        filename: sanitizedFilename,
        mimeType: file.mimetype,
        size: file.size,
        category: data.category,
        url: fileUrl,
        uploadedBy: userId,
        empresaId,
        bidId: inputDataWithBid.bidId || null, // Associar com licitação se fornecido
        doesExpire: validityData.doesExpire,
        issuedAt: validityData.issuedAt,
        expiresAt: validityData.expiresAt,
        versions: {
          create: {
            versionNumber: 1,
            filename: sanitizedFilename,
            mimeType: file.mimetype,
            size: file.size,
            url: fileUrl,
            uploadedBy: userId,
            empresaId,
            isCurrent: true,
          },
        },
      },
    });

    return this.mapToDocument(document);
  }

  /**
   * Cria uma nova versão de um documento existente
   * Usa transação para garantir integridade e evitar race conditions
   */
  private async createNewVersion(
    documentId: string,
    file: UploadedFile,
    sanitizedFilename: string,
    fileUrl: string,
    empresaId: string,
    userId: string,
  ): Promise<Document> {
    // Executar tudo em transação para evitar race conditions
    const result = await this.prisma.$transaction(async (tx) => {
      // Buscar documento existente (com lock implícito via transação)
      const existingDocument = await tx.document.findUnique({
        where: { id: documentId },
        include: {
          versions: {
            where: { empresaId },
            orderBy: { versionNumber: "desc" },
            take: 1,
          },
        },
      });

      // Validar tenant e soft delete
      if (!existingDocument || existingDocument.empresaId !== empresaId || existingDocument.deletedAt !== null) {
        throw new NotFoundException(`Documento com ID ${documentId} não encontrado`);
      }

      // Calcular próximo número de versão
      const nextVersionNumber =
        existingDocument.versions.length > 0
          ? existingDocument.versions[0].versionNumber + 1
          : 1;

      // Marcar versão atual como não atual (com filtro de tenant)
      await tx.documentVersion.updateMany({
        where: {
          documentId,
          empresaId,
          isCurrent: true,
        },
        data: {
          isCurrent: false,
        },
      });

      // Criar nova versão (com empresaId explícito)
      await tx.documentVersion.create({
        data: {
          documentId,
          empresaId,
          versionNumber: nextVersionNumber,
          filename: sanitizedFilename,
          mimeType: file.mimetype,
          size: file.size,
          url: fileUrl,
          uploadedBy: userId,
          isCurrent: true,
        },
      });

      // Atualizar documento com dados da nova versão (validado tenant acima)
      const updatedDocument = await tx.document.update({
        where: { id: documentId },
        data: {
          filename: sanitizedFilename,
          mimeType: file.mimetype,
          size: file.size,
          url: fileUrl,
        },
      });

      // Validar novamente após update (segurança extra)
      if (updatedDocument.empresaId !== empresaId || updatedDocument.deletedAt !== null) {
        throw new NotFoundException(`Documento com ID ${documentId} não encontrado`);
      }

      return updatedDocument;
    });

    return this.mapToDocument(result);
  }

  /**
   * Lista documentos com filtros e paginação
   */
  async findAll(filters: ListDocumentsFilters) {
    const prismaWithTenant = this.prismaTenant.forTenant(filters.empresaId);

    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100); // Máximo 100 por página
    const skip = (page - 1) * limit;

    // Construir filtros do Prisma
    const where: any = {
      empresaId: filters.empresaId,
      deletedAt: null, // Sempre filtrar soft delete
    };

    // Filtrar por licitação específica se fornecido
    if (filters.bidId) {
      where.bidId = filters.bidId;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    // Busca por nome (case insensitive)
    if (filters.search) {
      where.name = { contains: filters.search, mode: "insensitive" };
    }

    // Filtros de validade
    const now = getNowUTC();

    if (filters.status) {
      switch (filters.status) {
        case "NO_EXPIRATION":
          where.doesExpire = false;
          break;
        case "EXPIRED":
          where.doesExpire = true;
          where.expiresAt = { lte: now };
          break;
        case "EXPIRING_SOON": {
          where.doesExpire = true;
          const expiringSoonDate = new Date(now);
          expiringSoonDate.setDate(expiringSoonDate.getDate() + (filters.expiringDays || 30));
          where.expiresAt = {
            gte: now,
            lte: expiringSoonDate,
          };
          break;
        }
        case "VALID": {
          where.doesExpire = true;
          const validDate = new Date(now);
          validDate.setDate(validDate.getDate() + (filters.expiringDays || 30));
          where.expiresAt = { gt: validDate };
          break;
        }
      }
    }

    // Filtro por data de vencimento (antes de)
    if (filters.expiresBefore) {
      where.expiresAt = {
        ...(where.expiresAt || {}),
        lte: new Date(filters.expiresBefore),
      };
    }

    // Filtro por data de vencimento (depois de)
    if (filters.expiresAfter) {
      where.expiresAt = {
        ...(where.expiresAt || {}),
        gte: new Date(filters.expiresAfter),
      };
    }

    // Filtro por documentos expirando em até N dias
    if (filters.expiringDays !== undefined) {
      const expiringDate = new Date(now);
      expiringDate.setDate(expiringDate.getDate() + filters.expiringDays);
      where.doesExpire = true;
      where.expiresAt = {
        gte: now,
        lte: expiringDate,
      };
    }

    // Buscar documentos e total
    const [documents, total] = await Promise.all([
      prismaWithTenant.document.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prismaWithTenant.document.count({ where }),
    ]);

    return {
      data: documents.map((doc) => this.mapToDocument(doc)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Busca um documento por ID (com filtro de tenant)
   */
  async findOne(id: string, empresaId: string): Promise<Document> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);
    const document = await prismaWithTenant.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException(`Documento com ID ${id} não encontrado`);
    }

    return this.mapToDocument(document);
  }

  /**
   * Retorna o caminho físico do arquivo para download
   * Protegido contra path traversal
   */
  async getFilePathForDownload(id: string, empresaId: string): Promise<string> {
    const document = await this.findOne(id, empresaId);

    // Construir caminho completo do arquivo
    const fullPath = path.join(this.uploadsDir, document.url);

    // Proteção contra path traversal: garantir que o caminho resolvido está dentro de uploadsDir
    const resolvedPath = path.resolve(fullPath);
    const resolvedUploadsDir = path.resolve(this.uploadsDir);
    if (!resolvedPath.startsWith(resolvedUploadsDir)) {
      throw new BadRequestException("Caminho de arquivo inválido");
    }

    // Verificar se arquivo existe
    try {
      await fs.access(resolvedPath);
    } catch {
      throw new NotFoundException("Arquivo não encontrado no servidor");
    }

    return resolvedPath;
  }

  /**
   * Atualiza um documento (apenas metadados, não o arquivo)
   * Inclui campos de validade com validação e auditoria
   *
   * IMPORTANTE: Valida o estado final após merge do patch com estado atual
   */
  async update(id: string, data: UpdateDocumentInput, empresaId: string): Promise<Document> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);

    // Verificar se o documento existe e carregar estado atual
    const existingDocumentRaw = await prismaWithTenant.document.findUnique({
      where: { id },
    });

    if (!existingDocumentRaw) {
      throw new NotFoundException(`Documento com ID ${id} não encontrado`);
    }

    // Mapear para Document para ter acesso a todos os campos tipados
    const existingDocument = this.mapToDocument(existingDocumentRaw);

    // Preparar dados de atualização
    const updateData: any = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.category !== undefined) {
      updateData.category = data.category;
    }

    // Atualizar bidId se fornecido
    if (data.bidId !== undefined) {
      updateData.bidId = data.bidId;
    }

    // Fazer merge do patch com estado atual para campos de validade
    // REGRA DE OURO: PATCH parcial nunca deixa documento em estado inválido
    const mergedValidity = {
      doesExpire: data.doesExpire ?? existingDocument.doesExpire ?? false,
      issuedAt: data.issuedAt !== undefined
        ? (data.issuedAt ? new Date(data.issuedAt) : null)
        : (existingDocument.issuedAt ? new Date(existingDocument.issuedAt) : null),
      expiresAt: data.expiresAt !== undefined
        ? (data.expiresAt ? new Date(data.expiresAt) : null)
        : (existingDocument.expiresAt ? new Date(existingDocument.expiresAt) : null),
    };

    // REGRA CRÍTICA: Se doesExpire=false, expiresAt DEVE ser null no estado final
    // Não confiar no client - garantir coerência no backend
    if (mergedValidity.doesExpire === false) {
      mergedValidity.expiresAt = null;
    }

    // Validar estado final com documentValiditySchema (garante coerência)
    // Isso rejeita estados inválidos antes de persistir
    try {
      // Converter para formato do schema (ISO strings)
      const validityForValidation = {
        doesExpire: mergedValidity.doesExpire,
        issuedAt: mergedValidity.issuedAt?.toISOString() ?? null,
        expiresAt: mergedValidity.expiresAt?.toISOString() ?? null,
      };
      documentValiditySchema.parse(validityForValidation);
    } catch (error) {
      if (error instanceof Error && "errors" in error) {
        throw new BadRequestException({
          message: "Dados de validade inválidos",
          errors: (error as any).errors,
        });
      }
      throw new BadRequestException("Dados de validade inválidos");
    }

    // Se passou na validação, aplicar ao updateData
    // Aplicar sempre que houver campos de validade no patch ou quando doesExpire mudou
    const updateValidityFields =
      data.doesExpire !== undefined ||
      data.expiresAt !== undefined ||
      data.issuedAt !== undefined ||
      mergedValidity.doesExpire !== (existingDocument.doesExpire ?? false);

    if (updateValidityFields) {
      updateData.doesExpire = mergedValidity.doesExpire;
      updateData.issuedAt = mergedValidity.issuedAt;
      updateData.expiresAt = mergedValidity.expiresAt; // Já garantido como null se doesExpire=false
    }

    // Atualizar documento (usar transação para garantir consistência)
    const updatedDocument = await this.prisma.$transaction(async (tx) => {
      // Usar o Prisma direto na transação, mas garantir tenant isolation manualmente
      return tx.document.update({
        where: {
          id,
          empresaId, // Garantir tenant isolation na transação
        },
        data: updateData,
      });
    });

    return this.mapToDocument(updatedDocument);
  }

  /**
   * Remove um documento (soft delete é feito via SoftDeleteService)
   * Este método não deve ser usado diretamente
   */
  async remove(id: string, empresaId: string): Promise<void> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);

    const document = await prismaWithTenant.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException(`Documento com ID ${id} não encontrado`);
    }

    // Soft delete é feito via SoftDeleteService
    // Este método apenas valida que o documento existe
  }

  /**
   * Busca documentos por categoria
   */
  async findByCategory(category: string, empresaId: string): Promise<Document[]> {
    return (await this.findAll({ empresaId, category, page: 1, limit: 100 })).data;
  }

  /**
   * Conta total de documentos da empresa
   */
  async count(empresaId: string): Promise<number> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);
    return prismaWithTenant.document.count();
  }

  /**
   * Lista todas as versões de um documento
   */
  async getVersions(documentId: string, empresaId: string) {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);

    // Verificar se o documento existe e pertence ao tenant
    const document = await prismaWithTenant.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Documento com ID ${documentId} não encontrado`);
    }

    // Buscar versões (usando tenant scoping)
    const versions = await prismaWithTenant.documentVersion.findMany({
      where: { documentId },
      orderBy: { versionNumber: "desc" },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return versions.map((v: any) => ({
      id: v.id,
      documentId: v.documentId,
      versionNumber: v.versionNumber,
      filename: v.filename,
      mimeType: v.mimeType,
      size: v.size,
      url: v.url,
      uploadedBy: v.uploadedBy,
      isCurrent: v.isCurrent,
      createdAt: v.createdAt.toISOString(),
      uploader: v.uploader,
    }));
  }

  /**
   * Busca uma versão específica de um documento
   */
  async getVersion(documentId: string, versionNumber: number, empresaId: string) {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);

    // Verificar se o documento existe e pertence ao tenant
    const document = await prismaWithTenant.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Documento com ID ${documentId} não encontrado`);
    }

    // Buscar versão específica (usando tenant scoping)
    const version = await prismaWithTenant.documentVersion.findUnique({
      where: {
        documentId_versionNumber: {
          documentId,
          versionNumber,
        },
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!version) {
      throw new NotFoundException(
        `Versão ${versionNumber} do documento ${documentId} não encontrada`,
      );
    }

    return {
      id: version.id,
      documentId: version.documentId,
      versionNumber: version.versionNumber,
      filename: version.filename,
      mimeType: version.mimeType,
      size: version.size,
      url: version.url,
      uploadedBy: version.uploadedBy,
      isCurrent: version.isCurrent,
      createdAt: version.createdAt.toISOString(),
      uploader: version.uploader,
    };
  }

  /**
   * Restaura uma versão anterior de um documento
   * Usa transação para garantir integridade e evitar race conditions
   */
  async restoreVersion(
    documentId: string,
    versionNumber: number,
    empresaId: string,
    _userId: string,
  ): Promise<Document> {
    // Verificar se o arquivo existe antes da transação (não precisa estar em transação)
    // Mas validar documento e versão dentro da transação

    // Executar tudo em transação para evitar race conditions
    const result = await this.prisma.$transaction(async (tx) => {
      // Verificar se o documento existe
      const document = await tx.document.findUnique({
        where: { id: documentId },
      });

      // Validar tenant e soft delete
      if (!document || document.empresaId !== empresaId || document.deletedAt !== null) {
        throw new NotFoundException(`Documento com ID ${documentId} não encontrado`);
      }

      // Buscar versão a ser restaurada
      const versionToRestore = await tx.documentVersion.findUnique({
        where: {
          documentId_versionNumber: {
            documentId,
            versionNumber,
          },
        },
      });

      if (!versionToRestore) {
        throw new NotFoundException(
          `Versão ${versionNumber} do documento ${documentId} não encontrada`,
        );
      }

      // Validar que a versão pertence ao tenant
      if (versionToRestore.empresaId !== empresaId) {
        throw new NotFoundException(
          `Versão ${versionNumber} do documento ${documentId} não encontrada`,
        );
      }

      // Verificar se o arquivo da versão ainda existe
      const versionFilePath = path.join(this.uploadsDir, versionToRestore.url);
      try {
        await fs.access(versionFilePath);
      } catch {
        throw new NotFoundException(
          `Arquivo da versão ${versionNumber} não encontrado no servidor`,
        );
      }

      // Marcar versão atual como não atual (com filtro de tenant)
      await tx.documentVersion.updateMany({
        where: {
          documentId,
          empresaId,
          isCurrent: true,
        },
        data: {
          isCurrent: false,
        },
      });

      // Marcar versão restaurada como atual (validado empresaId acima)
      await tx.documentVersion.update({
        where: {
          documentId_versionNumber: {
            documentId,
            versionNumber,
          },
        },
        data: {
          isCurrent: true,
        },
      });

      // Atualizar documento com dados da versão restaurada (validado tenant acima)
      const updatedDocument = await tx.document.update({
        where: { id: documentId },
        data: {
          filename: versionToRestore.filename,
          mimeType: versionToRestore.mimeType,
          size: versionToRestore.size,
          url: versionToRestore.url,
        },
      });

      // Validar novamente após update (segurança extra)
      if (updatedDocument.empresaId !== empresaId || updatedDocument.deletedAt !== null) {
        throw new NotFoundException(`Documento com ID ${documentId} não encontrado`);
      }

      return updatedDocument;
    });

    return this.mapToDocument(result);
  }

  /**
   * Mapeia entidade Prisma para Document
   * Calcula status de validade derivado e daysToExpire
   * Retrocompatibilidade: aceita documentos sem campos de validade (defaults seguros)
   */
  private mapToDocument(doc: {
    id: string;
    empresaId: string;
    bidId?: string | null;
    name: string;
    filename: string;
    mimeType: string;
    size: number;
    category: string;
    url: string;
    uploadedBy: string;
    createdAt: Date;
    updatedAt: Date;
    status?: string | any;
    doesExpire?: boolean;
    issuedAt?: Date | null;
    expiresAt?: Date | null;
  }): Document {
    const now = getNowUTC();

    // Preparar dados de validade (com defaults seguros para retrocompatibilidade)
    const validityData: DocumentValidityData = {
      doesExpire: doc.doesExpire ?? false,
      issuedAt: doc.issuedAt ?? null,
      expiresAt: doc.expiresAt ?? null,
    };

    // Calcular status derivado
    const validityStatus = computeDocumentValidityStatus(now, validityData);

    // Calcular dias até vencimento
    const daysToExpireValue = daysToExpire(now, doc.expiresAt ?? null);

    return {
      id: doc.id,
      empresaId: doc.empresaId,
      bidId: doc.bidId || null,
      name: doc.name,
      filename: doc.filename,
      mimeType: doc.mimeType,
      size: doc.size,
      category: doc.category,
      url: doc.url,
      uploadedBy: doc.uploadedBy,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      status: (doc.status as any) ?? "ATIVO",
      // Campos de validade
      doesExpire: doc.doesExpire ?? false,
      issuedAt: doc.issuedAt?.toISOString() ?? null,
      expiresAt: doc.expiresAt?.toISOString() ?? null,
      // Status derivado (calculado)
      validityStatus,
      daysToExpire: daysToExpireValue,
    };
  }

  /**
   * Busca documentos expirando em até N dias
   * Útil para dashboards e alertas
   */
  async findExpiring(empresaId: string, days: number = 30): Promise<Document[]> {
    return (
      await this.findAll({
        empresaId,
        expiringDays: days,
        page: 1,
        limit: 1000, // Limite alto para dashboard
      })
    ).data;
  }

  /**
   * Vincula um documento a uma licitação
   * Valida que ambos pertencem à mesma empresa
   */
  async attachToBid(documentId: string, bidId: string, empresaId: string): Promise<Document> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);

    // Verificar se a licitação existe e pertence ao tenant
    const bid = await prismaWithTenant.bid.findUnique({
      where: { id: bidId },
    });

    if (!bid || bid.empresaId !== empresaId) {
      throw new NotFoundException(`Licitação com ID ${bidId} não encontrada`);
    }

    // Verificar se o documento existe e pertence ao tenant
    const document = await prismaWithTenant.document.findUnique({
      where: { id: documentId },
    });

    if (!document || document.empresaId !== empresaId) {
      throw new NotFoundException(`Documento com ID ${documentId} não encontrado`);
    }

    // Atualizar documento vinculando à licitação
    const updatedDocument = await prismaWithTenant.document.update({
      where: { id: documentId },
      data: { bidId },
    });

    return this.mapToDocument(updatedDocument);
  }

  /**
   * Desvincula um documento de uma licitação
   */
  async detachFromBid(documentId: string, empresaId: string): Promise<Document> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);

    // Verificar se o documento existe e pertence ao tenant
    const document = await prismaWithTenant.document.findUnique({
      where: { id: documentId },
    });

    if (!document || document.empresaId !== empresaId) {
      throw new NotFoundException(`Documento com ID ${documentId} não encontrado`);
    }

    // Se já não está vinculado, não faz nada
    if (!document.bidId) {
      return this.mapToDocument(document);
    }

    // Atualizar documento removendo vínculo com licitação
    const updatedDocument = await prismaWithTenant.document.update({
      where: { id: documentId },
      data: { bidId: null },
    });

    return this.mapToDocument(updatedDocument);
  }
}
