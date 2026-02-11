import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class CheckUserLimitGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const empresaId = request.user?.empresaId;

    if (!empresaId) return true; // Skip se não tem empresa

    const config = await this.prisma.clienteConfig.findUnique({
      where: { empresaId },
    });

    if (!config) return true; // Skip se não tem config

    const usuariosAtivos = await this.prisma.user.count({
      where: { empresaId, deletedAt: null },
    });

    if (usuariosAtivos >= config.maxUsuarios) {
      throw new ForbiddenException(
        `Limite de usuários atingido (${usuariosAtivos}/${config.maxUsuarios}). Faça upgrade do plano.`,
      );
    }

    return true;
  }
}

@Injectable()
export class CheckLicitacaoLimitGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const empresaId = request.user?.empresaId;

    if (!empresaId) return true;

    const config = await this.prisma.clienteConfig.findUnique({
      where: { empresaId },
    });

    if (!config) return true;

    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const licitacoesNoMes = await this.prisma.bid.count({
      where: {
        empresaId,
        createdAt: { gte: inicioMes },
        deletedAt: null,
      },
    });

    if (licitacoesNoMes >= config.maxLicitacoesMes) {
      throw new ForbiddenException(
        `Limite mensal de licitações atingido (${licitacoesNoMes}/${config.maxLicitacoesMes}).`,
      );
    }

    return true;
  }
}

@Injectable()
export class CheckAnaliseIALimitGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const empresaId = request.user?.empresaId;

    if (!empresaId) return true;

    const config = await this.prisma.clienteConfig.findUnique({
      where: { empresaId },
    });

    if (!config) return true;

    // Contar análises do mês atual
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const analisesNoMes = await this.prisma.editalAnalise.count({
      where: {
        empresaId,
        status: "CONCLUIDA",
        createdAt: { gte: inicioMes },
      },
    });

    if (analisesNoMes >= config.maxAnalisesMes) {
      throw new ForbiddenException(
        `Limite mensal de análises IA atingido (${analisesNoMes}/${config.maxAnalisesMes}). Faça upgrade do plano.`,
      );
    }

    return true;
  }
}

@Injectable()
export class CheckStorageLimitGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const empresaId = request.user?.empresaId;
    const fileSize = request.file?.size || 0; // Em bytes

    if (!empresaId) return true;

    const config = await this.prisma.clienteConfig.findUnique({
      where: { empresaId },
    });

    if (!config) return true;

    // Calcula storage atual (soma de todos os arquivos não deletados)
    const storageAtual = await this.prisma.document.aggregate({
      where: { empresaId, deletedAt: null },
      _sum: { size: true },
    });

    const storageUsadoGB = (storageAtual._sum.size || 0) / 1024 ** 3;
    const novoStorageGB = storageUsadoGB + fileSize / 1024 ** 3;

    if (novoStorageGB > config.maxStorageGB) {
      throw new ForbiddenException(
        `Limite de storage esgotado (${storageUsadoGB.toFixed(2)}/${config.maxStorageGB} GB).`,
      );
    }

    return true;
  }
}
