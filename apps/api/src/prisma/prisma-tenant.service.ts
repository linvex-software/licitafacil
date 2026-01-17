import { Injectable } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

/**
 * Prisma Client com filtro automático de tenant (empresaId)
 * 
 * Todas as queries são automaticamente filtradas pela empresaId do usuário,
 * garantindo isolamento total entre empresas.
 */
@Injectable()
export class PrismaTenantService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria um cliente Prisma com extensão de tenant
   * Todas as queries são automaticamente filtradas por empresaId
   */
  forTenant(empresaId: string) {
    return this.prisma.$extends({
      name: "tenant-filter",
      query: {
        bid: {
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
            // findUnique usa where ou id direto
            if (args?.where) {
              args.where = { ...args.where, empresaId };
            }
            return query(args).then((result) => {
              // Verificar se o resultado pertence ao tenant
              if (result && result.empresaId !== empresaId) {
                return null;
              }
              return result;
            });
          },
          async create({ args, query }) {
            if (args?.data) {
              // Garantir empresaId sem conflitar com relacionamento 'empresa'
              const data = args.data as any;
              if (!data.empresaId) {
                data.empresaId = empresaId;
              }
              // Remover relacionamento se existir (usar empresaId direto)
              if (data.empresa) {
                delete data.empresa;
              }
              args.data = data;
            }
            return query(args);
          },
          async update({ args, query }) {
            if (args?.where) {
              args.where = { ...args.where, empresaId };
            }
            return query(args);
          },
          async updateMany({ args, query }) {
            if (args?.where) {
              args.where = { ...args.where, empresaId };
            }
            return query(args);
          },
          async delete({ args, query }) {
            if (args?.where) {
              args.where = { ...args.where, empresaId };
            }
            return query(args);
          },
          async deleteMany({ args, query }) {
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
        },
        user: {
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
            // Para findUnique, validar após a query
            return query(args).then((result) => {
              if (result && result.empresaId !== empresaId) {
                return null;
              }
              return result;
            });
          },
          async create({ args, query }) {
            if (args?.data) {
              // Garantir empresaId sem conflitar com relacionamento 'empresa'
              const data = args.data as any;
              if (!data.empresaId) {
                data.empresaId = empresaId;
              }
              // Remover relacionamento se existir (usar empresaId direto)
              if (data.empresa) {
                delete data.empresa;
              }
              args.data = data;
            }
            return query(args);
          },
          async update({ args, query }) {
            if (args?.where) {
              args.where = { ...args.where, empresaId };
            }
            return query(args);
          },
          async updateMany({ args, query }) {
            if (args?.where) {
              args.where = { ...args.where, empresaId };
            }
            return query(args);
          },
          async delete({ args, query }) {
            if (args?.where) {
              args.where = { ...args.where, empresaId };
            }
            return query(args);
          },
          async deleteMany({ args, query }) {
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
        },
      },
    });
  }
}
