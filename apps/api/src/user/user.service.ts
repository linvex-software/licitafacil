import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PrismaTenantService } from "../prisma/prisma-tenant.service";
import { type CreateUserInput, type User, UserRole } from "@licitafacil/shared";
import * as bcrypt from "bcrypt";

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prismaTenant: PrismaTenantService,
  ) {}

  /**
   * Cria um novo usuário com senha hasheada
   */
  async create(data: CreateUserInput): Promise<User> {
    // Verificar se email já existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictException("Email já cadastrado");
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Criar usuário com role (default COLABORADOR se não especificado)
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        empresaId: data.empresaId,
        role: data.role || UserRole.COLABORADOR,
      },
    });

    return this.mapToUser(user);
  }

  /**
   * Lista todos os usuários da empresa (com filtro de tenant)
   */
  async findAll(empresaId: string): Promise<User[]> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);
    const users = await prismaWithTenant.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        empresaId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return users.map((user) => this.mapToUser(user));
  }

  /**
   * Busca usuário por email (inclui senha para validação)
   * Usado apenas no login, então não precisa de filtro de tenant
   * IMPORTANTE: Filtra usuários deletados (soft delete)
   */
  async findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: {
        email,
        deletedAt: null, // Soft delete: não permitir login de usuário deletado
      },
    });
  }

  /**
   * Busca usuário por ID sem filtro de tenant
   * Usado apenas para validação de token JWT
   * IMPORTANTE: Filtra usuários deletados (soft delete)
   */
  async findByIdForTokenValidation(userId: string): Promise<User | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null, // Soft delete: não permitir token de usuário deletado
      },
    });

    if (!user) {
      return null;
    }

    return this.mapToUser(user);
  }

  /**
   * Busca usuário por ID (com filtro de tenant)
   * Usuário só pode buscar usuários da própria empresa
   */
  async findOne(id: string, empresaId: string): Promise<User> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);
    const user = await prismaWithTenant.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
    }

    return this.mapToUser(user);
  }

  /**
   * Valida a senha do usuário
   */
  async validatePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // ========================================================
  // CRUD de Usuários (gestão pela empresa)
  // ========================================================

  /**
   * Cria um novo usuário para a empresa do admin logado
   */
  async createForEmpresa(
    empresaId: string,
    data: { email: string; password: string; name: string; role?: string },
  ): Promise<User> {
    // Verificar se email já existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictException("Email já cadastrado");
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        empresaId,
        role: (data.role as any) || UserRole.COLABORADOR,
      },
    });

    return this.mapToUser(user);
  }

  /**
   * Atualiza um usuário da mesma empresa
   */
  async updateForEmpresa(
    id: string,
    empresaId: string,
    data: { name?: string; role?: string },
  ): Promise<User> {
    // Verificar que pertence à empresa
    const usuario = await this.prisma.user.findFirst({
      where: { id, empresaId, deletedAt: null },
    });

    if (!usuario) {
      throw new NotFoundException("Usuário não encontrado");
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.role !== undefined) updateData.role = data.role;

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    return this.mapToUser(updated);
  }

  /**
   * Desativa um usuário (soft delete)
   */
  async deactivate(id: string, empresaId: string, currentUserId: string): Promise<{ message: string }> {
    // Impedir auto-desativação
    if (id === currentUserId) {
      throw new ForbiddenException("Você não pode desativar a si mesmo");
    }

    const usuario = await this.prisma.user.findFirst({
      where: { id, empresaId, deletedAt: null },
    });

    if (!usuario) {
      throw new NotFoundException("Usuário não encontrado");
    }

    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: "Usuário desativado com sucesso" };
  }

  /**
   * Exclui um usuário permanentemente (hard delete)
   */
  async deletePermanent(
    id: string,
    empresaId: string,
    currentUserId: string,
  ): Promise<{ message: string }> {
    if (id === currentUserId) {
      throw new ForbiddenException("Você não pode excluir sua própria conta");
    }

    const usuario = await this.prisma.user.findFirst({
      where: { id, empresaId },
    });

    if (!usuario) {
      throw new NotFoundException("Usuário não encontrado");
    }

    await this.prisma.user.delete({ where: { id } });

    return { message: "Usuário excluído permanentemente" };
  }

  /**
   * Reativa um usuário (reverter soft delete)
   */
  async reactivate(id: string, empresaId: string): Promise<User> {
    const usuario = await this.prisma.user.findFirst({
      where: { id, empresaId, deletedAt: { not: null } },
    });

    if (!usuario) {
      throw new NotFoundException("Usuário inativo não encontrado");
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { deletedAt: null },
    });

    return this.mapToUser(updated);
  }

  /**
   * Lista todos os usuários da empresa (incluindo inativos)
   */
  async findAllIncludingInactive(empresaId: string) {
    const users = await this.prisma.user.findMany({
      where: { empresaId },
      orderBy: [
        { deletedAt: "asc" }, // Ativos primeiro
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        empresaId: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });

    return users.map((u) => ({
      ...this.mapToUser(u),
      ativo: u.deletedAt === null,
    }));
  }

  /**
   * Retorna informações de limite de usuários da empresa
   */
  async obterLimite(empresaId: string) {
    const config = await this.prisma.clienteConfig.findUnique({
      where: { empresaId },
    });

    const maxUsuarios = config?.maxUsuarios ?? 999999;

    const usuariosAtivos = await this.prisma.user.count({
      where: { empresaId, deletedAt: null },
    });

    return {
      atual: usuariosAtivos,
      limite: maxUsuarios,
      disponivel: Math.max(0, maxUsuarios - usuariosAtivos),
      percentual: maxUsuarios > 0 ? (usuariosAtivos / maxUsuarios) * 100 : 0,
    };
  }

  /**
   * Mapeia entidade Prisma para User (sem senha)
   * Converte role do Prisma enum para shared enum
   */
  private mapToUser(user: {
    id: string;
    email: string;
    name: string;
    role: any; // Prisma UserRole enum (string literal)
    empresaId: string;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    // Converter role do Prisma (string literal) para enum do shared
    // Prisma retorna "ADMIN" | "COLABORADOR" como string
    const role = (user.role as string) as UserRole;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role,
      empresaId: user.empresaId,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
