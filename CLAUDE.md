# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm** (see `pnpm-workspace.yaml`); use `pnpm`, not `npm`/`yarn`.

```bash
pnpm install          # install deps
pnpm dev              # vite dev server on port 3000 (alias: pnpm start)
pnpm build            # vite build && tsc
pnpm serve            # preview a production build
pnpm test             # vitest run (no test files currently exist in src/)
pnpm type-check        # tsc -b
pnpm lint             # eslint . --fix
pnpm format           # prettier . --write
pnpm pre-commit       # type-check + lint + format, in order
pnpm extract           # lingui extract — pull new translatable strings from source
pnpm compile           # lingui compile --typescript — build message catalogs from locales
pnpm scan             # npx react-scan against localhost:3000 (must be already running)
```

To run a single test file: `pnpm exec vitest run path/to/file.test.ts`.

## Architecture

React 19 + TypeScript SPA built with Vite, using Mantine v8 as the component primitive layer and Tailwind v4 for utility styling. `@` is aliased to `src/`. Also shipped to mobile via Capacitor (`android/`, `ios/`).

### Routing vs. pages

TanStack Router is file-based, rooted at `src/routes/`, but route files are thin: they just call `createFileRoute` and render a page component from `src/pages/<feature>/`. Put actual UI/logic in `src/pages/**`, not in the route file. Route groups:

- `_app/` — authenticated shell (wrapped in `AppLayout`). `_app/route.tsx` runs `beforeLoad` guards reading `authUserStore.getState()` directly (not hooks, since guards run outside React) to: redirect unauthenticated users to `/sign-in`, lock all navigation to `/` while `shouldLockAppNavigation()` (accounts-payable setup store) is true, and redirect away from routes the session's `permissionKeys` mark not-visible.
- `_auth/` — sign-in/up, forgot/reset password.
- `embed/` — embeddable, unauthenticated views of dashboard/folders/requests (for iframing).
- `on-boarding/`, `form-builder/`, `workflow-builder/`, `playground/` — standalone flows outside the main app shell.
- `stories/` — a live catalogue route per base component (`accordion`, `modal`, `data-table`, ...); check here for intended usage of a `components/base` component before guessing its API.

### Mobile split

Many `_app` routes render `<AdaptiveScreen mobile={...} web={...} />` (from `@/pages/mobile`) to switch between a `src/pages/mobile/**` screen and the desktop `*Page` component at the route level — see `src/routes/_app/folders.tsx`. When touching a page that has both, check `src/pages/mobile` for a parallel implementation that also needs updating.

### State

Zustand throughout, no single global store — one global store plus per-feature stores colocated with their feature:
- `src/stores/authUserStore.ts` — session, identity/tokens, `isAuthenticated`, current user; `resetAuthState()` is the single logout path and also resets other stores (e.g. the AP setup store) to avoid redirect loops.
- Feature stores live under the feature, e.g. `src/pages/dashboard/workflows/accounts-payable/stores/useSetupStore.ts` (drives the `_app` navigation lock above), `src/pages/settings/stores/`, `src/pages/on-boarding/stores/`, `src/features/builder/store.ts`.

### API layer (`src/api/`)

Two backend generations coexist:
- **V5 (legacy)**: `axios.ts` exports `_axios` (plain) and `axiosCrypto` (encrypts request bodies / decrypts responses with an AES key+iv pulled from `authUserStore.identity`, via `src/utils/crypto`).
- **V6 (current)**: `axiosV6`, bearer-token auth from `authUserStore.identity.accessToken`, unencrypted, hits `VITE_V6_BASE_URL`. New backend work goes through `src/api/v6/*` and `apiRouter.ts`.

Both instance sets: dedupe in-flight identical requests via an `AbortController` map keyed on method+url+params (skip with `skipCancellation`), and on a `401` response call `authUserStore.resetAuthState()` and hard-redirect to `/sign-in`. `src/api/local/*` provides mock/local data (`local/forms`, `local/requests`, `local/workflows`, `users.json`) for development, and `src/services/mockBackend.ts` / `src/api/dummy/*` are additional fixture sources.

### Data fetching & i18n

TanStack Query is the fetching/caching layer (provider + query client in `src/lib/tanstack-query`). Translatable strings use Lingui macros (`@lingui/macro`, enforced by `eslint-plugin-lingui`); locale catalogs live in `src/locales/{ar,en,fr,ms}` and are regenerated with `pnpm extract` / `pnpm compile`. Note `main.tsx` currently forces LTR (`DirectionProvider detectDirection={false} initialDirection='ltr'`) regardless of locale.

### UI components

`src/components/base` wraps Mantine primitives into the project's design-system components (Button, Modal, Drawer, DataTable, inputs, etc.) — prefer these over raw Mantine or HTML elements, and check the matching `src/routes/stories/*.tsx` for intended usage. `src/components/common` holds higher-level shared widgets (file-upload, document-preview, filters, `AiBrandIcon`). Builder UIs use dedicated stacks: `src/features/builder` (drag-and-drop form builder: Canvas/FieldSidebar/QuestionCard + its own Zustand store) and `@xyflow/react` (React Flow) for the node-based workflow builder.

### Auth & tracking

MSAL (`@azure/msal-react`) and Google OAuth providers wrap the app in `main.tsx` for federated sign-in, but app-level session/token state lives in `authUserStore`, independent of the SDK's own state. PostHog (`posthog-js`) identifies the user whenever `setSession` is called; `src/lib/web-vitals` reports on load.

## Code style

- ESLint's `eslint-plugin-perfectionist` auto-sorts imports, exports, object keys, interface members, and JSX props — run `pnpm lint` rather than hand-ordering these, or diffs will churn.
- `prettier-plugin-tailwindcss` sorts Tailwind class lists on format.
- `.agent/rules/code-style-guide.md` (always-on) sets UI conventions to follow for new/changed components: no modals/drawers/popovers/overlays — use inline expansion or layout reflow instead, toasts are the only floating UI allowed; Tailwind classes must map to project tokens (`bg-surface-*`, `text-accent-*`, ...), no raw hex or inline styles; interactive components need a hover state, an active state, and an entrance animation; AI-feature icons must use `<AiBrandIcon />` from `@/components/common/AiBrandIcon`, never a generic sparkle icon. Note this rule file predates/conflicts with the existing `Modal`/`Drawer`/`Popover` components already in `components/base` and in active use — weigh it against the surrounding code when it's ambiguous which wins.
- `.agent/skills/` holds generic, non-project-specific design-assistance reference material (a UI/UX pattern database, a frontend visual-design guide, Vercel's web interface guidelines fetcher, and a vendored `stitch-skills` skill pack) — useful when doing UI/design work, not documentation of this repo's own conventions.
