# Copilot Instructions — Intune Assignment Checker

## Build & Run Commands

```bash
npm run dev          # Dev server on port 3001 (Turbopack)
npm run build        # Production build
npm run check        # Lint + typecheck combined
npm run lint         # ESLint only
npm run lint:fix     # ESLint with autofix
npm run typecheck    # TypeScript only (tsc --noEmit)
npm run format:check # Prettier check
npm run format:write # Prettier fix
```

There is no test framework configured in this project.

## Architecture

This is a **Next.js 16 App Router** application (T3 stack origin) that lets Intune admins visualize and audit Microsoft Intune policy assignments. It runs entirely client-side — there are no API routes or server actions. All data comes from the **Microsoft Graph API** via delegated permissions.

### Authentication Flow

MSAL React (`@azure/msal-react`) handles Entra ID authentication. The root layout wraps the app in `MSALProviderWrapper` → `QueryProvider`. Unauthenticated users see a landing page; authenticated users are redirected to `/dashboard`. Auth config lives in `src/config/authConfig.ts`.

### Data Layer

- **`src/services/graph.ts`** — All Microsoft Graph API calls with built-in retry logic (exponential backoff for 429/5xx). Creates a `Client` instance from `@microsoft/microsoft-graph-client`.
- **`src/services/policy-config.ts`** — Policy configuration normalization and comparison logic.
- **`src/hooks/useIntuneData.ts`** — Primary data hook that orchestrates fetching all Intune policy types (device configs, compliance, apps, scripts, etc.) using TanStack Query.
- **`src/hooks/useUserAssignments.ts`**, **`useCompareAssignments.ts`** — Specialized hooks for user-level and comparison views.

### Key Pages

| Route | Purpose |
|---|---|
| `/` | Landing page (redirects to `/dashboard` if authenticated) |
| `/dashboard` | Main dashboard with stats, inventory, drift detection |
| `/user-assignments` | User → Group → Policy graph visualization |
| `/compare` | Side-by-side policy comparison |
| `/assignments` | Assignment explorer |
| `/export` | Report export |
| `/features` | Feature overview with interactive graph |

### Type System

Types are in `src/types/` and model Microsoft Graph responses:
- `graph.ts` — Core Intune policy types (`IntunePolicy`, `Assignment`, `AssignmentDetail`, `PolicyData`)
- `user.ts` — Graph user/group/device types
- `compare.ts` — Comparison view types
- `features.ts` — Feature metadata types

## Conventions

### Path Aliases

Use `~/` to import from `src/`. Configured in `tsconfig.json` as `"~/*": ["./src/*"]`.

```typescript
import { cn } from "~/lib/utils";
import { loginRequest } from "~/config/authConfig";
```

### UI Components

- **shadcn/ui** (new-york style) with Radix UI primitives in `src/components/ui/`
- **Tailwind CSS v4** for styling; use the `cn()` utility from `~/lib/utils` for conditional classes
- **lucide-react** for icons
- **Recharts** for charts, **@xyflow/react** (React Flow) for node graphs

### TypeScript

- Strict mode enabled with `noUncheckedIndexedAccess`
- Prefer `type` imports: `import type { Foo } from "..."` (enforced by ESLint)
- Several `@typescript-eslint` safety rules are relaxed (no-explicit-any, no-unsafe-* family) — this is intentional due to Graph API response shapes

### Environment Variables

Validated at build time via `@t3-oss/env-nextjs` + Zod in `src/env.js`. Client-side vars must be prefixed with `NEXT_PUBLIC_`. Set `SKIP_ENV_VALIDATION=1` to bypass validation (useful for Docker builds).

Required vars:
- `NEXT_PUBLIC_AZURE_AD_CLIENT_ID`
- `NEXT_PUBLIC_AZURE_AD_TENANT_ID` (defaults to `"common"`)

### Output Mode

`next.config.js` uses `output: "standalone"` for containerized deployment to Azure App Service.
