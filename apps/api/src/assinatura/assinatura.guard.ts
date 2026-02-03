import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { AssinaturaService } from "./assinatura.service";

/**
 * Guard que bloqueia acesso quando a assinatura da empresa está vencida ou cancelada (F8-03).
 * Deve ser usado após JwtAuthGuard (que define request.user com empresaId).
 *
 * Uso: @UseGuards(JwtAuthGuard, AssinaturaAtivaGuard, RolesGuard)
 */
@Injectable()
export class AssinaturaAtivaGuard implements CanActivate {
  constructor(private readonly assinaturaService: AssinaturaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.empresaId) {
      return true;
    }

    const valida = await this.assinaturaService.isAssinaturaValida(
      user.empresaId,
    );

    if (!valida) {
      throw new ForbiddenException(
        "Assinatura vencida ou cancelada. Renove para continuar acessando o sistema.",
      );
    }

    return true;
  }
}
