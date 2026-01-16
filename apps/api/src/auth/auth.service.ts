import { Injectable, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserService } from "../user/user.service";
import { EmpresaService } from "../empresa/empresa.service";
import { CreateUserInput, LoginInput, type AuthResponse, type User } from "@licitafacil/shared";

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly empresaService: EmpresaService,
    private readonly jwtService: JwtService,
  ) {}

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
  async login(data: LoginInput): Promise<AuthResponse> {
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
    const userWithoutPassword: User = {
      id: user.id,
      email: user.email,
      name: user.name,
      empresaId: user.empresaId,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    // Gerar token JWT
    const accessToken = this.generateToken(userWithoutPassword);

    return {
      user: userWithoutPassword,
      accessToken,
    };
  }

  /**
   * Valida um token JWT e retorna o usuário
   */
  async validateUser(userId: string): Promise<User> {
    return this.userService.findOne(userId);
  }

  /**
   * Gera um token JWT
   */
  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      empresaId: user.empresaId,
    };

    return this.jwtService.sign(payload);
  }
}
