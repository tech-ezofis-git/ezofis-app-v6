# Conventions

Each sub-project has its own conventions. Read its notes first: `app/CLAUDE.md`, `mobile/CLAUDE.md`, `agents/README.md`, `api/README.md`.

## Repo-wide
- **The repo is private, but treat it as if it could leak.** Use only fake data (`@example.com`) and never commit secrets.
- Merging to `main` **deploys to production** (see `SETUP_AND_COMMANDS.md`).

## Branch flow (`testing` → `main`)
```
feature/xyz ──PR──► testing ──(everyone pulls & tests locally, test tenant)──► PR testing → main ──tech approves──► main ──► deploy
```
1. Start new work **from `testing`**: `git switch testing && git pull && git switch -c feature/xyz` (or `fix/…`, `chore/…`).
2. Open a **PR into `testing`**. The `PR checks` workflow builds and tests it.
3. After merging, everyone runs `git pull origin testing` and tests locally with the **test tenant**.
4. When `testing` is good: open **one PR `testing` → `main`**. `tech-ezofis-git` approves it, then merges.
5. Rules:
   - Everything in `testing` goes to `main` together. If a feature is broken, **revert it in `testing` first**.
   - Always move `testing` → `main` with a PR. Never copy files or cherry-pick by hand.
   - **Urgent production fix:** branch from `main`, PR into `main` (approved by tech), then merge `main` back into `testing`.
   - Open PRs from **your own GitHub account**. `tech-ezofis-git` only approves, because GitHub never lets an account approve its own PR.
   - Pushing to `testing` never deploys. Only `main` deploys.
   - Every PR is labelled automatically by `.github/workflows/pr-target-label.yml`: **`into: testing`** or **`into: main`**. A PR into `main` that doesn't come from `testing` also gets **`direct to main`** and one comment explaining the rule. Filter with `label:"into: main"` to see what will go to production.
6. Free plan note: GitHub can't block direct pushes here, so the deploy workflow blocks the **deploy** instead. A change on `main` is built and deployed only if it came from a PR whose **final commit** was approved by `tech-ezofis-git`. A direct push, an unapproved PR, or a PR with commits added after the approval fails the `Approved PR check` job, and nothing is built or deployed. Manual deploys can only be started by `tech-ezofis-git`.

## Where code changes go
- Since the switch-over on 30 Oct 2026, **everything is changed in this repo**: `app/`, `api/`, `agents/`, `mobile/`, `.github/` and docs.
- The old `v6api` and `AIorchestrator` repos no longer copy into this repo. Don't make changes there.
- AIorchestrator still copies into `v6local/agents/` until that repo's future is decided.

## Web app (`app/`)
- TypeScript + React function components. The `@` import alias maps to `app/src`.
- Route files in `src/routes/` only call `createFileRoute` and render a `src/pages/<feature>/…Page` component.
- Use the components in `src/components/base` instead of raw Mantine or HTML. Check `src/routes/stories/*` to see how each is meant to be used.
- New back-end calls go in `src/api/v6/*` through `axiosV6`. Use TanStack Query for fetching and Zustand for state.
- User-facing strings use Lingui macros (`t`, `<Trans>`). ESLint enforces this.
- ESLint `perfectionist` sorts imports, keys and JSX props, and Prettier sorts Tailwind classes. Run `npm run lint` and `npm run format` instead of ordering things by hand.
- Tailwind classes should use project tokens (`bg-surface-*`, `text-accent-*`), with no raw hex. AI features use `<AiBrandIcon />`.
- Request-action validation order (form settings first, then stage settings) lives in `validateBeforeAction` (`src/pages/requests/components/request/Request.tsx`). See `app/CLAUDE.md`.
- Tests: Vitest, `*.test.ts(x)` next to the code (for example `src/features/sub-workflow/subWorkflow.test.ts`).

## API (`api/`)
- Clean Architecture per module: `<Module>.Domain` / `.Application` / `.Infrastructure`. Each layer registers itself with an `Add<Module>Application()` or `Add<Module>Infrastructure(config)` extension method that `Program.cs` calls.
- Namespaces: `SaaSApp.<Area>…`. Controllers are `sealed`, use `[ApiController]` and `[Route("api/…")]`, and get services through constructor injection. Private fields are named `_camelCase`.
- Both patterns are used: MediatR commands/queries (with `TransactionBehavior`) and direct service classes (`api/src/Api/Services/*Service.cs` behind `I*Service` interfaces). Most newer controllers call services directly.
- Multi-tenancy: every tenant-scoped call needs a resolved tenant (`X-Tenant-Id` or JWT `tid`). Tenant tables are created or upgraded lazily by the `*SchemaEnsuringMiddleware` classes and the SQL in `api/scripts/postgres/`.
- Config is through the options pattern (`api/src/Api/Options`) and env vars use `__` (for example `Hangfire__RunServerInApi`).
- Error handling: controllers often `try/catch (Exception ex)` and return `BadRequest(new { error = ex.Message })`. Responses use the shape `{ "error": "…" }`. Logging uses Serilog with a correlation ID (`X-Correlation-ID`).
- Tests: xUnit projects in `api/tests/<Module>.Infrastructure.Tests`.

## Agents (`agents/`)
- FastAPI, Pydantic models, and settings in `app/config.py` (pydantic-settings, env-driven).
- Prompts and skills are data, kept in `agents/skills/` and the `app/*_skills/` packages, and can also be loaded from the DB (`AGENT_PACKS_FROM_DB`, `AP_PIPELINE_FROM_DB`).
- Structured JSON logs carry a `correlation_id`. Guardrail rejections return generic messages only.
- Tests: pytest in `agents/tests/test_*.py` with fakes (`fakes.py`, fakeredis). Tests must not call real LLMs. The eval harness is separate.

## Mobile (`mobile/`)
- Plain JS/JSX. Rules are in `mobile/CLAUDE.md`: don't hard-code per-workflow labels, never show technical IDs, and never make live writes from tests.
