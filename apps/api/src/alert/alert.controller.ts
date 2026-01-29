import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { AlertService } from "./alert.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Tenant } from "../common/decorators/tenant.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Audit } from "../audit-log/decorators/audit.decorator";
import { AuditInterceptor } from "../audit-log/interceptors/audit.interceptor";
import { DevBypassGuard } from "../auth/guards/dev-bypass.guard";
import {
  createAlertSchema,
  type Alert,
  type CreateAlertInput,
  User,
  UserRole,
} from "@licitafacil/shared";

@Controller("alerts")
@UseGuards(DevBypassGuard, JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class AlertController {
  constructor(private readonly alertService: AlertService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  @Audit({ action: "alert.create", resourceType: "Alert" })
  async create(
    @Body() body: unknown,
    @Tenant() empresaId: string,
    @CurrentUser() user: User,
  ): Promise<Alert> {
    const result = createAlertSchema.safeParse(body);
    if (!result.success) {
      throw { status: 400, message: "Dados inválidos", errors: result.error.errors };
    }
    return this.alertService.create(result.data as CreateAlertInput, empresaId, user?.id);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async findAll(
    @Tenant() empresaId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("status") status?: string,
    @Query("severity") severity?: string,
    @Query("type") type?: string,
  ) {
    return this.alertService.findAll({
      empresaId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status,
      severity,
      type,
    });
  }

  @Get(":id")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async findOne(@Param("id") id: string, @Tenant() empresaId: string) {
    return this.alertService.findOne(id, empresaId);
  }

  @Post(":id/mark-seen")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  @HttpCode(HttpStatus.OK)
  @Audit({ action: "alert.mark_seen", resourceType: "Alert", captureResourceId: true })
  async markSeen(@Param("id") id: string, @Tenant() empresaId: string, @CurrentUser() user: User) {
    return this.alertService.markSeen(id, empresaId, user?.id);
  }

  @Post(":id/mark-resolved")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  @HttpCode(HttpStatus.OK)
  @Audit({ action: "alert.mark_resolved", resourceType: "Alert", captureResourceId: true })
  async markResolved(@Param("id") id: string, @Tenant() empresaId: string, @CurrentUser() user: User) {
    return this.alertService.markResolved(id, empresaId, user?.id);
  }
}

