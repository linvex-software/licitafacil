import { Injectable, ConflictException, NotFoundException } from "@nestjs/common";
import { type PrismaService } from "../prisma/prisma.service";
import { type PrismaTenantService } from "../prisma/prisma-tenant.service";
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
   */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Busca usuário por ID sem filtro de tenant
   * Usado apenas para validação de token JWT
   */
  async findByIdForTokenValidation(userId: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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
