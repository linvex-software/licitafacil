import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { PrismaTenantService } from "../prisma/prisma-tenant.service";
import {
  type CreateDocumentInput,
  type UpdateDocumentInput,
  type Document,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from "@licitafacil/shared";
import * as fs from "fs/promises";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

/**
 * Interface para filtros de listagem de documentos
 */
export interface ListDocumentsFilters {
  empresaId: string;
  category?: string;
  search?: string; // Busca por nome
  page?: number;
  limit?: number;
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

  constructor(private readonly prismaTenant: PrismaTenantService) {
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
    const now = new Date();
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
    const now = new Date();
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
   * Cria um novo documento via upload
   */
  async create(
    file: UploadedFile,
    data: CreateDocumentInput,
    empresaId: string,
    userId: string,
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

    // Salvar metadados no banco de dados
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);
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
      },
    });

    return this.mapToDocument(document);
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
    };

    if (filters.category) {
      where.category = filters.category;
    }

    // Busca por nome (case insensitive)
    if (filters.search) {
      where.name = { contains: filters.search, mode: "insensitive" };
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
   */
  async getFilePathForDownload(id: string, empresaId: string): Promise<string> {
    const document = await this.findOne(id, empresaId);

    // Construir caminho completo do arquivo
    const fullPath = path.join(this.uploadsDir, document.url);

    // Verificar se arquivo existe
    try {
      await fs.access(fullPath);
    } catch {
      throw new NotFoundException("Arquivo não encontrado no servidor");
    }

    return fullPath;
  }

  /**
   * Atualiza um documento (apenas metadados, não o arquivo)
   */
  async update(id: string, data: UpdateDocumentInput, empresaId: string): Promise<Document> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);

    // Verificar se o documento existe
    const existingDocument = await prismaWithTenant.document.findUnique({
      where: { id },
    });

    if (!existingDocument) {
      throw new NotFoundException(`Documento com ID ${id} não encontrado`);
    }

    // Atualizar apenas campos fornecidos
    const updatedDocument = await prismaWithTenant.document.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.category && { category: data.category }),
      },
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
   * Mapeia entidade Prisma para Document
   */
  private mapToDocument(doc: {
    id: string;
    empresaId: string;
    name: string;
    filename: string;
    mimeType: string;
    size: number;
    category: string;
    url: string;
    uploadedBy: string;
    createdAt: Date;
    updatedAt: Date;
  }): Document {
    return {
      id: doc.id,
      empresaId: doc.empresaId,
      name: doc.name,
      filename: doc.filename,
      mimeType: doc.mimeType,
      size: doc.size,
      category: doc.category,
      url: doc.url,
      uploadedBy: doc.uploadedBy,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }
}
