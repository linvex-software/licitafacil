import { Injectable } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

/**
 * Prisma Client com filtro automático de tenant (empresaId) e soft delete
 *
 * Todas as queries são automaticamente filtradas pela empresaId do usuário,
 * garantindo isolamento total entre empresas, e também filtram registros deletados
 * (deletedAt IS NULL), garantindo soft delete global.
 */
@Injectable()
export class PrismaTenantService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria um cliente Prisma com extensão de tenant e soft delete
   * Todas as queries são automaticamente filtradas por empresaId e deletedAt IS NULL
   */
  forTenant(empresaId: string) {
    // Helper function para adicionar filtros de tenant e soft delete
    const addTenantAndSoftDeleteFilter = (where: any): any => {
      const baseWhere = {
        empresaId,
        deletedAt: null, // Soft delete: apenas registros não deletados
      };

      if (!where) {
        return baseWhere;
      }

      // Merge inteligente: se where já tem empresaId ou deletedAt, combinar
      // Se where tem operadores AND/OR, aplicar com cuidado
      return {
        AND: [
          baseWhere,
          where,
        ],
      };
    };

    return this.prisma.$extends({
      name: "tenant-filter",
      query: {
        bid: {
          async findMany({ args, query }) {
            args.where = addTenantAndSoftDeleteFilter(args?.where);
            return query(args);
          },
          async findFirst({ args, query }) {
            args.where = addTenantAndSoftDeleteFilter(args?.where);
            return query(args);
          },
          async findUnique({ args, query }) {
            // findUnique usa where ou id direto
            const result = await query(args);
            // Verificar se o resultado pertence ao tenant e não está deletado
            if (!result || result.empresaId !== empresaId || result.deletedAt !== null) {
              return null;
            }
            return result;
          },
          async create({ args, query }) {
            if (args?.data) {
              // Garantir empresaId sem conflitar com relacionamento 'empresa'
              const data = args.data as any;
              if (!data.empresaId) {
                data.empresaId = empresaId;
              }
              // Garantir que deletedAt seja null ao criar
              data.deletedAt = null;
              // Remover relacionamento se existir (usar empresaId direto)
              if (data.empresa) {
                delete data.empresa;
              }
              args.data = data;
            }
            return query(args);
          },
          async update({ args, query }) {
            // Para update, não podemos modificar o where (precisa ser unique)
            // Então fazemos a query e validamos o resultado
            const result = await query(args);
            if (!result || result.empresaId !== empresaId || result.deletedAt !== null) {
              return null;
            }
            return result;
          },
          async updateMany({ args, query }) {
            args.where = addTenantAndSoftDeleteFilter(args?.where);
            return query(args);
          },
          async delete({ args: _args, query: _query }) {
            // Hard delete não permitido via tenant service
            // Usar SoftDeleteService para soft delete
            throw new Error(
              "Hard delete não é permitido. Use SoftDeleteService para realizar soft delete.",
            );
          },
          async deleteMany({ args: _args, query: _query }) {
            // Hard delete não permitido via tenant service
            throw new Error(
              "Hard delete não é permitido. Use SoftDeleteService para realizar soft delete.",
            );
          },
          async count({ args, query }) {
            args.where = addTenantAndSoftDeleteFilter(args?.where);
            return query(args);
          },
        },
        user: {
          async findMany({ args, query }) {
            args.where = addTenantAndSoftDeleteFilter(args?.where);
            return query(args);
          },
          async findFirst({ args, query }) {
            args.where = addTenantAndSoftDeleteFilter(args?.where);
            return query(args);
          },
          async findUnique({ args, query }) {
            // Para findUnique, validar após a query
            const result = await query(args);
            // Verificar se o resultado pertence ao tenant e não está deletado
            if (!result || result.empresaId !== empresaId || result.deletedAt !== null) {
              return null;
            }
            return result;
          },
          async create({ args, query }) {
            if (args?.data) {
              // Garantir empresaId sem conflitar com relacionamento 'empresa'
              const data = args.data as any;
              if (!data.empresaId) {
                data.empresaId = empresaId;
              }
              // Garantir que deletedAt seja null ao criar
              data.deletedAt = null;
              // Remover relacionamento se existir (usar empresaId direto)
              if (data.empresa) {
                delete data.empresa;
              }
              args.data = data;
            }
            return query(args);
          },
          async update({ args, query }) {
            // Para update, não podemos modificar o where (precisa ser unique)
            // Então fazemos a query e validamos o resultado
            const result = await query(args);
            if (!result || result.empresaId !== empresaId || result.deletedAt !== null) {
              return null;
            }
            return result;
          },
          async updateMany({ args, query }) {
            args.where = addTenantAndSoftDeleteFilter(args?.where);
            return query(args);
          },
          async delete({ args: _args, query: _query }) {
            // Hard delete não permitido via tenant service
            throw new Error(
              "Hard delete não é permitido. Use SoftDeleteService para realizar soft delete.",
            );
          },
          async deleteMany({ args: _args, query: _query }) {
            // Hard delete não permitido via tenant service
            throw new Error(
              "Hard delete não é permitido. Use SoftDeleteService para realizar soft delete.",
            );
          },
          async count({ args, query }) {
            args.where = addTenantAndSoftDeleteFilter(args?.where);
            return query(args);
          },
        },
        empresa: {
          async findMany({ args, query }) {
            args.where = addTenantAndSoftDeleteFilter(args?.where);
            return query(args);
          },
          async findFirst({ args, query }) {
            args.where = addTenantAndSoftDeleteFilter(args?.where);
            return query(args);
          },
          async findUnique({ args, query }) {
            const result = await query(args);
            // Verificar se o resultado pertence ao tenant e não está deletado
            if (!result || result.id !== empresaId || result.deletedAt !== null) {
              return null;
            }
            return result;
          },
          async create({ args, query }) {
            if (args?.data) {
              const data = args.data as any;
              // Garantir que deletedAt seja null ao criar
              data.deletedAt = null;
              args.data = data;
            }
            return query(args);
          },
          async update({ args, query }) {
            // Para update, não podemos modificar o where (precisa ser unique)
            // Então fazemos a query e validamos o resultado
            const result = await query(args);
            if (!result || result.id !== empresaId || result.deletedAt !== null) {
              return null;
            }
            return result;
          },
          async updateMany({ args, query }) {
            args.where = addTenantAndSoftDeleteFilter(args?.where);
            return query(args);
          },
          async delete({ args: _args, query: _query }) {
            // Hard delete não permitido via tenant service
            throw new Error(
              "Hard delete não é permitido. Use SoftDeleteService para realizar soft delete.",
            );
          },
          async deleteMany({ args: _args, query: _query }) {
            // Hard delete não permitido via tenant service
            throw new Error(
              "Hard delete não é permitido. Use SoftDeleteService para realizar soft delete.",
            );
          },
          async count({ args, query }) {
            args.where = addTenantAndSoftDeleteFilter(args?.where);
            return query(args);
          },
        },
        document: {
          async findMany({ args, query }) {
            args.where = addTenantAndSoftDeleteFilter(args?.where);
            return query(args);
          },
          async findFirst({ args, query }) {
            args.where = addTenantAndSoftDeleteFilter(args?.where);
            return query(args);
          },
          async findUnique({ args, query }) {
            // findUnique usa where ou id direto
            const result = await query(args);
            // Verificar se o resultado pertence ao tenant e não está deletado
            if (!result || result.empresaId !== empresaId || result.deletedAt !== null) {
              return null;
            }
            return result;
          },
          async create({ args, query }) {
            if (args?.data) {
              // Garantir empresaId sem conflitar com relacionamento 'empresa'
              const data = args.data as any;
              if (!data.empresaId) {
                data.empresaId = empresaId;
              }
              // Garantir que deletedAt seja null ao criar
              data.deletedAt = null;
              // Remover relacionamentos se existirem (usar IDs diretos)
              if (data.empresa) {
                delete data.empresa;
              }
              if (data.uploader) {
                delete data.uploader;
              }
              if (data.bid) {
                delete data.bid;
              }
              args.data = data;
            }
            return query(args);
          },
          async update({ args, query }) {
            // Para update, não podemos modificar o where (precisa ser unique)
            // Então fazemos a query e validamos o resultado
            const result = await query(args);
            if (!result || result.empresaId !== empresaId || result.deletedAt !== null) {
              return null;
            }
            return result;
          },
          async updateMany({ args, query }) {
            args.where = addTenantAndSoftDeleteFilter(args?.where);
            return query(args);
          },
          async delete({ args: _args, query: _query }) {
            // Hard delete não permitido via tenant service
            // Usar SoftDeleteService para soft delete
            throw new Error(
              "Hard delete não é permitido. Use SoftDeleteService para realizar soft delete.",
            );
          },
          async deleteMany({ args: _args, query: _query }) {
            // Hard delete não permitido via tenant service
            throw new Error(
              "Hard delete não é permitido. Use SoftDeleteService para realizar soft delete.",
            );
          },
          async count({ args, query }) {
            args.where = addTenantAndSoftDeleteFilter(args?.where);
            return query(args);
          },
        },
        auditLog: {
          // AuditLog não tem soft delete (é imutável), apenas filtro de tenant
          async findMany({ args, query }) {
            if (args?.where) {
              args.where = { ...args.where, empresaId };
            } else {
              args = { ...args, where: { empresaId } };
            }
            return query(args);
          },
          async findFirst({ args, query }) {
            if (args?.where) {
              args.where = { ...args.where, empresaId };
            } else {
              args = { ...args, where: { empresaId } };
            }
            return query(args);
          },
          async findUnique({ args, query }) {
            const result = await query(args);
            if (result && result.empresaId !== empresaId) {
              return null;
            }
            return result;
          },
          async create({ args, query }) {
            if (args?.data) {
              const data = args.data as any;
              if (!data.empresaId) {
                data.empresaId = empresaId;
              }
              if (data.empresa) {
                delete data.empresa;
              }
              args.data = data;
            }
            return query(args);
          },
          async count({ args, query }) {
            if (args?.where) {
              args.where = { ...args.where, empresaId };
            } else {
              args = { ...args, where: { empresaId } };
            }
            return query(args);
          },
          // AuditLog é imutável: não permitir update/delete
          async update({ args: _args, query: _query }: any) {
            throw new Error("AuditLog é imutável: operações de update não são permitidas");
          },
          async updateMany({ args: _args, query: _query }: any) {
            throw new Error("AuditLog é imutável: operações de update não são permitidas");
          },
          async delete({ args: _args, query: _query }: any) {
            throw new Error("AuditLog é imutável: operações de delete não são permitidas");
          },
          async deleteMany({ args: _args, query: _query }: any) {
            throw new Error("AuditLog é imutável: operações de delete não são permitidas");
          },
        },
        documentVersion: {
          // DocumentVersion não tem soft delete, apenas filtro de tenant
          async findMany({ args, query }) {
            if (args?.where) {
              args.where = { ...args.where, empresaId };
            } else {
              args = { ...args, where: { empresaId } };
            }
            return query(args);
          },
          async findFirst({ args, query }) {
            if (args?.where) {
              args.where = { ...args.where, empresaId };
            } else {
              args = { ...args, where: { empresaId } };
            }
            return query(args);
          },
          async findUnique({ args, query }) {
            const result = await query(args);
            if (result && result.empresaId !== empresaId) {
              return null;
            }
            return result;
          },
          async create({ args, query }) {
            if (args?.data) {
              const data = args.data as any;
              if (!data.empresaId) {
                data.empresaId = empresaId;
              }
              if (data.empresa) {
                delete data.empresa;
              }
              args.data = data;
            }
            return query(args);
          },
          async update({ args, query }) {
            // Para update, validar após a query
            const result = await query(args);
            if (!result || result.empresaId !== empresaId) {
              return null;
            }
            return result;
          },
          async updateMany({ args, query }) {
            if (args?.where) {
              args.where = { ...args.where, empresaId };
            } else {
              args = { ...args, where: { empresaId } };
            }
            return query(args);
          },
          async count({ args, query }) {
            if (args?.where) {
              args.where = { ...args.where, empresaId };
            } else {
              args = { ...args, where: { empresaId } };
            }
            return query(args);
          },
          // DocumentVersion não deve ser deletado diretamente (cascade via Document)
          async delete({ args: _args, query: _query }: any) {
            throw new Error(
              "Delete direto de DocumentVersion não é permitido. Use cascade via Document.",
            );
          },
          async deleteMany({ args: _args, query: _query }: any) {
            throw new Error(
              "Delete direto de DocumentVersion não é permitido. Use cascade via Document.",
            );
          },
        },
        checklistTemplate: {
          async findMany({ args, query }) {
            args.where = addTenantAndSoftDeleteFilter(args?.where);
            return query(args);
          },
          async findFirst({ args, query }) {
            args.where = addTenantAndSoftDeleteFilter(args?.where);
            return query(args);
          },
          async findUnique({ args, query }) {
            // findUnique usa where ou id direto
            const result = await query(args);
            // Verificar se o resultado pertence ao tenant e não está deletado
            if (!result || result.empresaId !== empresaId || result.deletedAt !== null) {
              return null;
            }
            return result;
          },
          async create({ args, query }) {
            if (args?.data) {
              // Garantir empresaId sem conflitar com relacionamento 'empresa'
              const data = args.data as any;
              if (!data.empresaId) {
                data.empresaId = empresaId;
              }
              // Garantir que deletedAt seja null ao criar
              data.deletedAt = null;
              // Remover relacionamentos se existirem (usar IDs diretos)
              if (data.empresa) {
                delete data.empresa;
              }
              if (data.creator) {
                delete data.creator;
              }
              args.data = data;
            }
            return query(args);
          },
          async update({ args, query }) {
            // Para update, não podemos modificar o where (precisa ser unique)
            // Então fazemos a query e validamos o resultado
            const result = await query(args);
            if (!result || result.empresaId !== empresaId || result.deletedAt !== null) {
              return null;
            }
            return result;
          },
          async updateMany({ args, query }) {
            args.where = addTenantAndSoftDeleteFilter(args?.where);
            return query(args);
          },
          async delete({ args: _args, query: _query }) {
            // Hard delete não permitido via tenant service
            // Usar SoftDeleteService para soft delete
            throw new Error(
              "Hard delete não é permitido. Use SoftDeleteService para realizar soft delete.",
            );
          },
          async deleteMany({ args: _args, query: _query }) {
            // Hard delete não permitido via tenant service
            throw new Error(
              "Hard delete não é permitido. Use SoftDeleteService para realizar soft delete.",
            );
          },
          async count({ args, query }) {
            args.where = addTenantAndSoftDeleteFilter(args?.where);
            return query(args);
          },
        },
        prazo: {
          async findMany({ args, query }) {
            args.where = addTenantAndSoftDeleteFilter(args?.where);
            return query(args);
          },
          async findFirst({ args, query }) {
            args.where = addTenantAndSoftDeleteFilter(args?.where);
            return query(args);
          },
          async findUnique({ args, query }) {
            const result = await query(args);
            if (!result || result.empresaId !== empresaId || result.deletedAt !== null) {
              return null;
            }
            return result;
          },
          async create({ args, query }) {
            if (args?.data) {
              const data = args.data as any;
              if (!data.empresaId) {
                data.empresaId = empresaId;
              }
              data.deletedAt = null;
              if (data.empresa) delete data.empresa;
              if (data.bid) delete data.bid;
              args.data = data;
            }
            return query(args);
          },
          async update({ args, query }) {
            const result = await query(args);
            if (!result || result.empresaId !== empresaId || result.deletedAt !== null) {
              return null;
            }
            return result;
          },
          async updateMany({ args, query }) {
            args.where = addTenantAndSoftDeleteFilter(args?.where);
            return query(args);
          },
          async delete({ args: _args, query: _query }) {
            throw new Error(
              "Hard delete não é permitido. Use SoftDeleteService para realizar soft delete.",
            );
          },
          async deleteMany({ args: _args, query: _query }) {
            throw new Error(
              "Hard delete não é permitido. Use SoftDeleteService para realizar soft delete.",
            );
          },
          async count({ args, query }) {
            args.where = addTenantAndSoftDeleteFilter(args?.where);
            return query(args);
          },
        },
        peticao: {
          async findMany({ args, query }) {
            args.where = addTenantAndSoftDeleteFilter(args?.where);
            return query(args);
          },
          async findFirst({ args, query }) {
            args.where = addTenantAndSoftDeleteFilter(args?.where);
            return query(args);
          },
          async findUnique({ args, query }) {
            const result = await query(args);
            if (!result || result.empresaId !== empresaId || result.deletedAt !== null) {
              return null;
            }
            return result;
          },
          async create({ args, query }) {
            if (args?.data) {
              const data = args.data as any;
              if (!data.empresaId) {
                data.empresaId = empresaId;
              }
              data.deletedAt = null;
              if (data.empresa) delete data.empresa;
              if (data.bid) delete data.bid;
              args.data = data;
            }
            return query(args);
          },
          async update({ args, query }) {
            const result = await query(args);
            if (!result || result.empresaId !== empresaId || result.deletedAt !== null) {
              return null;
            }
            return result;
          },
          async updateMany({ args, query }) {
            args.where = addTenantAndSoftDeleteFilter(args?.where);
            return query(args);
          },
          async delete({ args: _args, query: _query }) {
            throw new Error(
              "Hard delete não é permitido. Use SoftDeleteService para realizar soft delete.",
            );
          },
          async deleteMany({ args: _args, query: _query }) {
            throw new Error(
              "Hard delete não é permitido. Use SoftDeleteService para realizar soft delete.",
            );
          },
          async count({ args, query }) {
            args.where = addTenantAndSoftDeleteFilter(args?.where);
            return query(args);
          },
        },
        alert: {
          async findMany({ args, query }) {
            args.where = addTenantAndSoftDeleteFilter(args?.where);
            return query(args);
          },
          async findFirst({ args, query }) {
            args.where = addTenantAndSoftDeleteFilter(args?.where);
            return query(args);
          },
          async findUnique({ args, query }) {
            const result = await query(args);
            if (!result || result.empresaId !== empresaId || result.deletedAt !== null) {
              return null;
            }
            return result;
          },
          async create({ args, query }) {
            if (args?.data) {
              const data = args.data as any;
              if (!data.empresaId) {
                data.empresaId = empresaId;
              }
              data.deletedAt = null;
              if (data.empresa) delete data.empresa;
              args.data = data;
            }
            return query(args);
          },
          async update({ args, query }) {
            const result = await query(args);
            if (!result || result.empresaId !== empresaId || result.deletedAt !== null) {
              return null;
            }
            return result;
          },
          async updateMany({ args, query }) {
            args.where = addTenantAndSoftDeleteFilter(args?.where);
            return query(args);
          },
          async delete({ args: _args, query: _query }) {
            throw new Error(
              "Hard delete não é permitido. Use SoftDeleteService para realizar soft delete.",
            );
          },
          async deleteMany({ args: _args, query: _query }) {
            throw new Error(
              "Hard delete não é permitido. Use SoftDeleteService para realizar soft delete.",
            );
          },
          async count({ args, query }) {
            args.where = addTenantAndSoftDeleteFilter(args?.where);
            return query(args);
          },
        },
      },
    });
  }
}
