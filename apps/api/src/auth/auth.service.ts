import { Injectable, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserService } from "../user/user.service";
import { EmpresaService } from "../empresa/empresa.service";
import { AuditLogService } from "../audit-log/audit-log.service";
import { EmailService } from "../email/email.service";
import { PrismaService } from "../prisma/prisma.service";
import { type CreateUserInput, type LoginInput, type AuthResponse, type User } from "@licitafacil/shared";
import * as crypto from "crypto";
import * as bcrypt from "bcrypt";

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly empresaService: EmpresaService,
    private readonly jwtService: JwtService,
    private readonly auditLogService: AuditLogService,
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
  ) { }

  /**
   * Registra um novo usuário
   */
  async register(data: CreateUserInput): Promise<AuthResponse> {
    // Validar se a empresa existe
    const empresaExists = await this.empresaService.exists(data.empresaId);
    if (!empresaExists) {
      throw new BadRequestException("Empresa não encontrada");
    }

    // Criar usuário
    const user = await this.userService.create(data);

    // Gerar token JWT
    const accessToken = this.generateToken(user);

    return {
      user,
      accessToken,
    };
  }

  /**
   * Realiza login
   */
  async login(data: LoginInput, request?: any): Promise<AuthResponse> {
    // Buscar usuário por email
    const user = await this.userService.findByEmail(data.email);

    if (!user) {
      throw new UnauthorizedException("Credenciais inválidas");
    }

    // Validar senha
    const isPasswordValid = await this.userService.validatePassword(
      data.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("Credenciais inválidas");
    }

    // Mapear para User (sem senha)
    // Converter role do Prisma (string literal) para enum do shared
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    const role = (user.role as string) as import("@licitafacil/shared").UserRole;

    const userWithoutPassword: User = {
      id: user.id,
      email: user.email,
      name: user.name,
      role,
      empresaId: user.empresaId,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    // Gerar token JWT
    const accessToken = this.generateToken(userWithoutPassword);

    // Registrar log de auditoria (após sucesso, não bloqueia se falhar)
    this.recordAuditLog("auth.login", userWithoutPassword, request, { email: data.email }).catch((error) => {
      console.error("Erro ao registrar log de auditoria (login):", error);
    });

    return {
      user: userWithoutPassword,
      accessToken,
    };
  }

  /**
   * Valida um token JWT e retorna o usuário
   * Usa método específico sem filtro de tenant para validação de token
   */
  async validateUser(userId: string): Promise<User> {
    const user = await this.userService.findByIdForTokenValidation(userId);

    if (!user) {
      throw new UnauthorizedException("Usuário não encontrado");
    }

    return user;
  }

  /**
   * Gera um token JWT
   */
  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      empresaId: user.empresaId,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }

  /**
   * Envia email de recuperação de senha
   * POST /auth/forgot-password
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Sempre retorna sucesso para não vazar se o email existe ou não
    if (!user || user.deletedAt) {
      return { message: "Se o email existir, você receberá as instruções em breve." };
    }

    // Gera token aleatório seguro
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpires: expires,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetLink = `${frontendUrl}/redefinir-senha?token=${token}`;

    // Envia email (não bloqueia se falhar)
    this.emailService.sendEmail({
      to: user.email,
      subject: "Recuperação de senha — LicitaFácil",
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto">
          <h2>Redefinição de senha</h2>
          <p>Olá, <strong>${user.name}</strong>!</p>
          <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
          <p>
            <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#10b981;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">
              Redefinir minha senha
            </a>
          </p>
          <p style="color:#6b7280;font-size:13px">Este link expira em <strong>1 hora</strong>. Se não foi você, ignore este email.</p>
          <p style="color:#6b7280;font-size:12px">Ou copie: ${resetLink}</p>
        </div>
      `,
    }).catch(() => { }); // Não deixa erro de email quebrar a requisição

    return { message: "Se o email existir, você receberá as instruções em breve." };
  }

  /**
   * Redefine a senha usando o token de reset
   * POST /auth/reset-password
   */
  async resetPassword(token: string, novaSenha: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { passwordResetToken: token },
    });

    if (!user || !user.passwordResetExpires) {
      throw new BadRequestException("Token inválido ou expirado.");
    }

    if (user.passwordResetExpires < new Date()) {
      throw new BadRequestException("Token expirado. Solicite uma nova redefinição.");
    }

    const hashedPassword = await bcrypt.hash(novaSenha, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return { message: "Senha redefinida com sucesso!" };
  }

  /**
   * Altera a senha do usuário autenticado
   * PATCH /auth/me/senha
   */
  async alterarSenha(userId: string, senhaAtual: string, novaSenha: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException("Usuário não encontrado.");

    const isValid = await bcrypt.compare(senhaAtual, user.password);
    if (!isValid) throw new BadRequestException("Senha atual incorreta.");

    const hashedPassword = await bcrypt.hash(novaSenha, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: "Senha alterada com sucesso!" };
  }

  /**
   * Atualiza o nome do usuário autenticado
   */
  async atualizarNome(userId: string, name: string): Promise<{ name: string }> {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { name },
      select: { name: true },
    });
    return updated;
  }

  /**
   * Registra log de auditoria (helper interno)
   * Não bloqueia a operação principal se falhar
   */
  private async recordAuditLog(
    action: string,
    user: User | null,
    request: any | null,
    metadata: Record<string, any> | null,
  ): Promise<void> {
    if (!user || !user.empresaId) {
      return; // Não registrar se não houver empresaId
    }

    const ip = request?.ip || request?.connection?.remoteAddress || null;
    const userAgent = request?.headers?.["user-agent"] || null;

    // Sanitizar metadata removendo campos sensíveis
    const sanitizedMetadata = this.sanitizeMetadata(metadata);

    await this.auditLogService.record({
      empresaId: user.empresaId,
      userId: user.id,
      action,
      resourceType: "User",
      resourceId: user.id,
      metadata: sanitizedMetadata,
      ip,
      userAgent,
    });
  }

  /**
   * Sanitiza metadata removendo campos sensíveis
   */
  private sanitizeMetadata(data: any): Record<string, any> | null {
    if (!data || typeof data !== "object") {
      return null;
    }

    const sensitiveFields = [
      "password",
      "senha",
      "token",
      "accesstoken",
      "refreshtoken",
      "authorization",
      "cookie",
      "set-cookie",
      "secret",
      "apikey",
      "privatekey",
      "private_key",
    ];

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      const keyLower = key.toLowerCase();
      if (sensitiveFields.includes(keyLower)) {
        continue;
      }

      if (typeof value === "string" && value.length > 500) {
        sanitized[key] = value.substring(0, 500) + "... (truncated)";
      } else if (typeof value === "object" && value !== null) {
        // Não incluir objetos aninhados complexos
        continue;
      } else {
        sanitized[key] = value;
      }
    }

    return Object.keys(sanitized).length > 0 ? sanitized : null;
  }
}
