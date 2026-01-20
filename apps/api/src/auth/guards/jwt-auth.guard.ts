import { Injectable, type ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    // Se já existe usuário no request (injetado por DevBypassGuard), permitir acesso
    if (request.user) {
      return true;
    }

    // Caso contrário, validar JWT normalmente
    return super.canActivate(context);
  }
}
