import {
  Injectable,
  CanActivate,
} from "@nestjs/common";

/**
 * Guards de limite desativados.
 * Produto migrado para plano único high-ticket — sem restrições de uso.
 * Classes mantidas para evitar quebrar imports, mas retornam true sempre.
 */

@Injectable()
export class CheckUserLimitGuard implements CanActivate {
  async canActivate(): Promise<boolean> {
    return true;
  }
}

@Injectable()
export class CheckLicitacaoLimitGuard implements CanActivate {
  async canActivate(): Promise<boolean> {
    return true;
  }
}

@Injectable()
export class CheckAnaliseIALimitGuard implements CanActivate {
  async canActivate(): Promise<boolean> {
    return true;
  }
}

@Injectable()
export class CheckStorageLimitGuard implements CanActivate {
  async canActivate(): Promise<boolean> {
    return true;
  }
}
