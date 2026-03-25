# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
pnpm dev                          # Start all apps in parallel
pnpm --filter @licitafacil/web dev   # Frontend only (port 3000)
pnpm --filter @licitafacil/api dev   # Backend only (port 3001)
```

### Quality Checks (always run before declaring task done)
```bash
pnpm typecheck   # TypeScript check (tsc --noEmit)
pnpm lint        # ESLint across all packages
pnpm test        # Jest tests (all)
pnpm --filter @licitafacil/api test -- --testPathPattern="src/module-name"  # Single module test
```

### Database
```bash
pnpm prisma:migrate    # Create and apply migration
pnpm prisma:generate   # Regenerate Prisma client
pnpm prisma:studio     # Visual database browser
pnpm prisma:seed       # Seed development data
pnpm --filter @licitafacil/api seed:admin   # Seed super-admin user (only in api package)
```

### Build
```bash
pnpm build                            # Full production build
pnpm --filter @licitafacil/shared build  # Build shared package (needed before api/web)
pnpm --filter @licitafacil/ui build      # Build UI package (needed before web)
```

## Architecture

**Monorepo**: Turborepo + PNPM workspaces

```
apps/api/         → NestJS backend (port 3001)
apps/web/         → Next.js 15 frontend (port 3000)
packages/shared/  → Zod schemas + shared types (single source of truth)
packages/ui/      → Shared React component library
packages/config/  → ESLint, tsconfig, Prettier configs
```

### Backend (NestJS)

Modules in `apps/api/src/`: `auth`, `user`, `empresa`, `bid`, `document`, `checklist-template`, `checklist-item`, `prazo`, `alert`, `audit-log`, `admin`, `email`, `mail`, `relatorios`, `juridico`, `analise`, `disputa`, `negocios`, `monitoramento`, `ai`, `integracoes/comprasnet`, `integracoes/diarios`, `common`, `prisma`.

**Key patterns:**
- `JwtAuthGuard` + `RolesGuard` + `TenantGuard` on all protected routes
- `@Public()` decorator marks routes that skip auth (login, verify email, etc.)
- `@CurrentUser()` decorator extracts user from JWT
- `@Roles(UserRole.ADMIN)` for role-based access
- Rate limiting: `ThrottlerGuard` at 120 req/min per IP (applied globally)
- Bull/BullMQ + Redis for async jobs
- Socket.IO at `/alerts-ws` for real-time notifications
- OpenAI (GPT-4o) via `AiModule` for edital analysis and predictions

**Roles**: `SUPER_ADMIN` → `ADMIN` → `COLABORADOR`

**Tenant isolation via `PrismaTenantService`:**

Never query Prisma directly in services — always use `PrismaTenantService.forTenant(empresaId)`. This returns an extended Prisma client that automatically injects `empresaId` and `deletedAt: null` filters on every query, and blocks hard deletes at the ORM level.

```ts
// Correct pattern in any service
const db = this.prismaTenant.forTenant(empresaId);
const bids = await db.bid.findMany({ where: { ... } });

// For operations not covered by the tenant extension (e.g. AuditLog writes by SUPER_ADMIN),
// use this.prisma directly — but only when intentional.
```

**Soft delete**: Use `SoftDeleteService` to set `deletedAt`. Never call `.delete()` via `PrismaTenantService` — it throws an error.

### Frontend (Next.js 15 App Router)

- Most protected pages live directly under `app/` and rely on `AuthGuard` component for auth enforcement
- Only `app/(authenticated)/` route group exists for specific cases
- Public routes: `login/`, `verificar/[codigo]/`, `redefinir-senha/`
- Auth state in `src/contexts/auth-context.tsx`
- HTTP calls via `src/lib/api.ts` (axios instance with JWT interceptor + auto-redirect on 401)
- TanStack React Query for server state; hooks in `src/hooks/`
- Real-time via Socket.IO: `useDisputaSocket` and `useMonitoramentoSocket` hooks
- Radix UI + Tailwind CSS; shared components in `src/components/ui/`

### Shared Package

`packages/shared/src/` exports Zod schemas and TypeScript types used by both api and web. When adding a new entity, define its schema here first.

### Database (Prisma + PostgreSQL)

Schema at `apps/api/prisma/schema.prisma` (~1000 lines, 30+ models).

Critical patterns:
- Every tenant-scoped model has `empresaId` + index on `[empresaId, deletedAt]`
- `AuditLog` is write-once (no `updatedAt`, no `deletedAt`) — mutations throw via the tenant extension
- `DocumentVersion` deletions are cascade-only (no direct delete)
- User roles: `SUPER_ADMIN`, `ADMIN`, `COLABORADOR`
- Planos: `BASICO`, `PROFISSIONAL`, `ENTERPRISE`

## Key Conventions

- **Validation**: Use Zod schemas from `@licitafacil/shared` for DTOs. Never trust raw client input.
- **No `any`**: Use proper types or `unknown` + type guard.
- **Tenant isolation**: Always use `PrismaTenantService.forTenant(empresaId)` in services — never raw `PrismaService` for tenant-scoped data.
- **Error handling**: Controllers throw `BadRequestException`, `NotFoundException`, `ForbiddenException` with descriptive messages.
- **Migrations**: Always review the generated SQL before applying. Migrations are irreversible.
- **Shared types**: Before creating a type, check `packages/shared/src/` — it may already exist.
