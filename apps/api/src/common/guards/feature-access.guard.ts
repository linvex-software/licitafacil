import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ClienteStatus } from "@prisma/client";
import { IS_PUBLIC_KEY } from "../../auth/decorators/public.decorator";
import { FEATURE_KEY } from "../decorators/require-feature.decorator";
import {
  FEATURE_MATRIX,
  type FeatureName,
  getRequiredPlan,
} from "../constants/feature-matrix";
import { ClienteConfigCacheService } from "../services/cliente-config-cache.service";

@Injectable()
export class FeatureAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly clienteConfigCache: ClienteConfigCacheService,
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
    const { plano, status } = await this.clienteConfigCache.getPlanAndStatus(empresaId);

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
}
