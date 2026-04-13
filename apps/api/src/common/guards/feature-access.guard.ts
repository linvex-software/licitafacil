import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ClienteStatus, PlanoTipo } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { IS_PUBLIC_KEY } from "../../auth/decorators/public.decorator";
import { FEATURE_KEY } from "../decorators/require-feature.decorator";
import {
  FEATURE_MATRIX,
  type FeatureName,
  getRequiredPlan,
} from "../constants/feature-matrix";

interface CachedCliente {
  plano: PlanoTipo;
  status: ClienteStatus;
  fetchedAt: number;
}

const clienteConfigCache = new Map<string, CachedCliente>();
const TTL_MS = 60_000;

@Injectable()
export class FeatureAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const feature = this.reflector.getAllAndOverride<FeatureName>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!feature) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as { empresaId?: string } | undefined;
    if (!user?.empresaId) {
      throw new UnauthorizedException();
    }

    const empresaId = user.empresaId;
    const { plano, status } = await this.getClientePlanAndStatus(empresaId);

    if (status === ClienteStatus.SUSPENSO || status === ClienteStatus.CANCELADO) {
      throw new ForbiddenException({
        statusCode: 403,
        code: "ACCOUNT_INACTIVE",
        message: "Sua conta está suspensa ou cancelada",
        status,
      });
    }

    const allowed = FEATURE_MATRIX[feature];
    if (!allowed.includes(plano)) {
      throw new ForbiddenException({
        statusCode: 403,
        code: "FEATURE_LOCKED",
        message: "Recurso não disponível no seu plano atual",
        currentPlan: plano,
        requiredPlan: getRequiredPlan(feature),
        feature,
      });
    }

    return true;
  }

  private async getClientePlanAndStatus(
    empresaId: string,
  ): Promise<{ plano: PlanoTipo; status: ClienteStatus }> {
    const now = Date.now();
    const cached = clienteConfigCache.get(empresaId);
    if (cached && now - cached.fetchedAt <= TTL_MS) {
      return { plano: cached.plano, status: cached.status };
    }

    const config = await this.prisma.clienteConfig.findFirst({
      where: { empresaId, deletedAt: null },
    });

    const plano = config?.plano ?? PlanoTipo.STARTER;
    const status = config?.status ?? ClienteStatus.ATIVO;

    clienteConfigCache.set(empresaId, { plano, status, fetchedAt: now });

    return { plano, status };
  }
}
