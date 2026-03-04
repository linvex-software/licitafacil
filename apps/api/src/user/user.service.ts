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

const MAX_USERS_PER_EMPRESA = 30;

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prismaTenant: PrismaTenantService,
  ) { }

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
    currentUserRole?: string,
  ): Promise<User> {
    // Regra de hierarquia: ADMIN não pode criar SUPER_ADMIN
    if (currentUserRole === UserRole.ADMIN && data.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        "Apenas Super Admins podem criar outros Super Admins.",
      );
    }

    const totalUsuariosCriados = await this.prisma.user.count({
      where: { empresaId },
    });

    if (totalUsuariosCriados >= MAX_USERS_PER_EMPRESA) {
      throw new ForbiddenException(
        `Limite de ${MAX_USERS_PER_EMPRESA} usuários atingido para esta empresa`,
      );
    }

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
    currentUserRole?: string,
  ): Promise<User> {
    // Verificar que pertence à empresa
    const usuario = await this.prisma.user.findFirst({
      where: { id, empresaId, deletedAt: null },
    });

    if (!usuario) {
      throw new NotFoundException("Usuário não encontrado");
    }

    // Regra de hierarquia: ADMIN não pode editar SUPER_ADMIN
    if (currentUserRole === UserRole.ADMIN && usuario.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        "Você não tem permissão para editar um Super Admin.",
      );
    }

    // Regra de hierarquia: ADMIN não pode promover para SUPER_ADMIN
    if (currentUserRole === UserRole.ADMIN && data.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        "Apenas Super Admins podem promover outros usuários para Super Admin.",
      );
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
  async deactivate(id: string, empresaId: string, currentUserId: string, currentUserRole?: string): Promise<{ message: string }> {
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

    // Regra de hierarquia: ADMIN não pode desativar SUPER_ADMIN
    if (currentUserRole === UserRole.ADMIN && usuario.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        "Você não tem permissão para desativar um Super Admin.",
      );
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
    currentUserRole?: string,
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

    // Regra de hierarquia: ADMIN não pode excluir SUPER_ADMIN
    if (currentUserRole === UserRole.ADMIN && usuario.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        "Você não tem permissão para excluir um Super Admin.",
      );
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
   * Retorna informações de uso de usuários da empresa.
   * Limite fixo de 30 usuários por empresa.
   */
  async obterLimite(empresaId: string) {
    const usuariosCriados = await this.prisma.user.count({
      where: { empresaId },
    });

    const percentual = Math.min(
      Math.round((usuariosCriados / MAX_USERS_PER_EMPRESA) * 100),
      100,
    );

    return {
      atual: usuariosCriados,
      limite: MAX_USERS_PER_EMPRESA,
      disponivel: Math.max(MAX_USERS_PER_EMPRESA - usuariosCriados, 0),
      percentual,
    };
  }

  // ========================================================
  // Configurações de Notificações por Email
  // ========================================================

  /**
   * Retorna as preferências de notificação do usuário
   */
  async getNotificacoes(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        receberEmails: true,
        receberDocVencendo: true,
        receberPrazoCritico: true,
        receberRisco: true,
        frequenciaEmail: true,
      },
    });
  }

  /**
   * Atualiza as preferências de notificação do usuário
   */
  async updateNotificacoes(
    userId: string,
    dto: {
      receberEmails?: boolean;
      receberDocVencendo?: boolean;
      receberPrazoCritico?: boolean;
      receberRisco?: boolean;
      frequenciaEmail?: string;
    },
  ) {
    const updateData: Record<string, unknown> = {};

    if (dto.receberEmails !== undefined) updateData.receberEmails = dto.receberEmails;
    if (dto.receberDocVencendo !== undefined) updateData.receberDocVencendo = dto.receberDocVencendo;
    if (dto.receberPrazoCritico !== undefined) updateData.receberPrazoCritico = dto.receberPrazoCritico;
    if (dto.receberRisco !== undefined) updateData.receberRisco = dto.receberRisco;
    if (dto.frequenciaEmail !== undefined) updateData.frequenciaEmail = dto.frequenciaEmail;

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        receberEmails: true,
        receberDocVencendo: true,
        receberPrazoCritico: true,
        receberRisco: true,
        frequenciaEmail: true,
      },
    });
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
