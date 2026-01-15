# Guia de Contribuicao

## Fluxo
- Crie branches a partir de `main` (protegida; sem push/force-push direto).
- Nome de branch:
  - `feature/<issue-id>-<slug>` (ex: `feature/F0-02-auth`)
  - `fix/<issue-id>-<slug>` (ex: `fix/F0-04-tenant-isolation`)
- Sempre abra PR.
- Minimo: 1 review obrigatorio.
- Merge so apos status checks passarem.

## Commits
- Use Conventional Commits:
  - `feat: ...`, `fix: ...`, `docs: ...`, `chore: ...`, `refactor: ...`, `test: ...`, `style: ...`
- (Opcional) Commitlint + Husky para validar mensagens localmente.

## Pull Request
1) Rodar localmente:
   - `pnpm lint` (se existir)
   - `pnpm typecheck` (se existir)
   - `pnpm test` (se existir)
   - `pnpm build` (se existir)
2) Preencher o template de PR.
3) Garantir CI verde e aguardar 1 review.
4) Merge via PR.

## Branch protection (configurar no GitHub)
- Exigir PR antes de merge; bloquear push/force-push na `main`.
- Exigir >=1 review.
- Exigir status checks: `lint`, `typecheck` (e `test` quando existir).
