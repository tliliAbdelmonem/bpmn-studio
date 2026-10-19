# CLAUDE.md — BPMN Studio

Guidance for Claude (and humans) working in this repository. Read this before touching code.

## What this is

BPMN Studio: a web app to create, version, preview, import/export and deploy BPMN models to a **Camunda 8 (Zeebe) Orchestration Cluster**. Camunda 7 is out of scope; never use Camunda 7 moddle, APIs or extension elements.

Out of scope (do not build): authentication, multi-tenancy, collaboration, process instance monitoring, element templates, linting.

## Working rules

- Work **phase by phase** per `IMPLEMENTATION_PLAN.md`. At the end of each phase: stop, summarize, list what to verify, wait for an explicit "go".
- Do not refactor or touch files outside the current phase's scope.
- Before adding any dependency, state why. Pin exact versions of all bpmn-io packages (no `^`/`~`).
- If a requirement is ambiguous or depends on the Camunda version, check the running cluster's OpenAPI/Swagger or the official docs. Do not guess; ask if still unclear.
- Prefer CSS-native solutions (`:has()`, `:focus-within`, `<dialog>`, container queries, `details/summary`) over JS state.
- No application secrets in the repo. `.env` is git-ignored; `.env.example` is committed.

## Stack (strict)

| Area      | Choice                                                                                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Monorepo  | Nx + pnpm. `apps/web`, `apps/api`, `libs/shared`                                                                                                                   |
| Frontend  | Angular **21** (not 22), standalone, signals, OnPush, Tailwind CSS v4                                                                                              |
| Backend   | NestJS **11** (not 12), TypeORM, PostgreSQL, class-validator, `@nestjs/config`, Swagger                                                                            |
| BPMN      | `bpmn-js`, `bpmn-js-properties-panel`, `@bpmn-io/properties-panel`, `zeebe-bpmn-moddle`, `camunda-bpmn-js-behaviors` (required peer of the Zeebe properties panel) |
| Engine    | Camunda 8 Orchestration Cluster, REST API v2 (`CAMUNDA_BASE_URL`, default `http://localhost:8080/v2`)                                                              |
| Dev infra | `docker-compose.yml`: PostgreSQL + local Camunda 8 cluster, no auth                                                                                                |

Note: npm `latest` is already Angular 22 / NestJS 12. Always install with an explicit major (`@angular/core@21`, `@nestjs/core@11`) and keep the Nx version compatible with Angular 21.

## Frontend conventions (`apps/web`)

- Standalone components only. **No NgModules.**
- `changeDetection: ChangeDetectionStrategy.OnPush` on every component.
- `inject()` only; no constructor injection.
- Signals for state: `signal`, `computed`, `input()`, `output()`, `model()`; `resource`/`httpResource`-style patterns only inside `ApiService` consumers via signals.
- Control flow: `@if`, `@for` (with `track`), `@switch`. No `*ngIf`/`*ngFor`.
- **No `ngModel`/`FormsModule`.** Forms use signal state (signal forms if stable in Angular 21, otherwise signals + `(input)` bindings).
- Tailwind v4 utility classes inline in templates. **No per-component CSS files / `styles`.** The only stylesheet is `apps/web/src/styles.css` (Tailwind import + bpmn-js / diagram-js / bpmn-font / properties-panel CSS).
- Routes are lazy (`loadComponent` / `loadChildren` with route arrays).
- **All HTTP goes through `ApiService`** (`apps/web/src/app/core/api.service.ts`). Components and features never inject `HttpClient`.
- Pages are thin. bpmn-js logic lives in reusable components under `apps/web/src/app/bpmn/`.
- Shared DTO types come from `@bpmn-studio/shared`; never redeclare API shapes in the web app.
- Reuse the UI primitives in `apps/web/src/app/shared/ui/`: `bsButton` directive (variants primary/secondary/danger/ghost), `bs-dialog` (native `<dialog>`), `bs-confirm-dialog`, `bs-toast-outlet` + `ToastService`. API errors are `ProblemDetails`; show them with `problemMessage()`.
- Read-only diagrams use `bs-bpmn-viewer` (`apps/web/src/app/bpmn/bpmn-viewer.ts`); bpmn-js stays in lazy chunks.

### bpmn-js integration rules

- Instantiate in `ngAfterViewInit`, inside `NgZone.runOutsideAngular` (see open question on zoneless in the plan).
- Call `destroy()` in `ngOnDestroy`.
- Guard with `isPlatformBrowser`.
- Missing typings go in `apps/web/src/bpmn.d.ts`.
- Register CSS globally in `apps/web/src/styles.css`: `bpmn-js/dist/assets/diagram-js.css`, `bpmn-js/dist/assets/bpmn-js.css`, `bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css` (done), `@bpmn-io/properties-panel/dist/assets/properties-panel.css` (Phase 4).
- **Keep the bpmn.io watermark/logo visible** (bpmn-js license). Never hide it with CSS.
- Emit changes to the page via signal outputs; the component never calls the API.

## Backend conventions (`apps/api`)

- Global prefix `/api`; Swagger UI at `/api/docs`.
- Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.
- DTOs use class-validator and implement the interfaces from `libs/shared`.
- Config via `@nestjs/config` with schema validation at boot; the app fails fast on bad env.
- TypeORM with **migrations only**; `synchronize: false` everywhere, including tests.
- Errors are RFC 9457 `application/problem+json` (`type`, `title`, `status`, `detail`, `instance`, optional `errors`) via one global exception filter.
- BPMN XML is validated (well-formed + parses as BPMN with the Zeebe moddle) before being stored.
- All Camunda HTTP calls live in `CamundaClientService`. Deploy sends multipart with field `resources`; never set `Content-Type` manually (let `FormData` set the boundary).
- `BpmnModelVersion` rows are immutable. Restore creates a new version. New versions are appended in a transaction holding a row lock on the model (`VersionsService.append`).
- `bpmn-moddle` is ESM-only: the API loads it with `require()` (Node >= 22.12) in `src/bpmn/bpmn-moddle.ts`, and Jest transforms it (`transformIgnorePatterns` in `apps/api/jest.config.cts`).
- New migrations must be added to `apps/api/src/database/migrations/index.ts` (webpack bundle, no globs).
- Test helpers live in `*.fixtures.ts` (excluded from the app build).

## Environment variables

| Name                  | Default                                                                      | Purpose                                                    |
| --------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `PORT`                | `3000`                                                                       | API port                                                   |
| `DATABASE_URL`        | required (`.env.example`: `postgres://bpmn:bpmn@localhost:5432/bpmn_studio`) | PostgreSQL                                                 |
| `CAMUNDA_BASE_URL`    | `http://localhost:8080/v2`                                                   | Orchestration Cluster REST API v2                          |
| `CORS_ORIGIN`         | unset (CORS off)                                                             | Comma-separated origins, only needed without the dev proxy |
| `MAX_BPMN_SIZE_BYTES` | `5242880`                                                                    | Upload / body limit                                        |

## Commands

Requires Node 22.12+ (`.nvmrc`), pnpm 10, Docker.

```bash
pnpm install
cp .env.example .env                      # once
pnpm infra:up                             # docker compose up -d: postgres + Camunda 8.10
pnpm start:api                            # nx serve api  -> http://localhost:3000/api, docs at /api/docs
pnpm start:web                            # nx serve web  -> http://localhost:4200 (proxies /api to :3000)
pnpm build                                # nx run-many -t build
pnpm lint                                 # nx run-many -t lint
pnpm test                                 # nx run-many -t test (Jest for api, Vitest for web)
pnpm format:check                         # prettier --check .
pnpm nx run api:migration:generate --name=<Name>   # then add the class to apps/api/src/database/migrations/index.ts
pnpm nx run api:migration:run
pnpm nx run api:migration:revert
pnpm nx run api:migration:show
pnpm infra:down
```

Local URLs: API http://localhost:3000/api, Swagger http://localhost:3000/api/docs, Camunda REST http://localhost:8080/v2, Operate http://localhost:8080/operate (demo/demo).

## Pinned versions

Nx 22.7.12, Angular 21.2.x, NestJS 11, TypeScript 5.9, TypeORM 0.3.31, Tailwind 4.3.3, bpmn-js 18.31.0, bpmn-moddle 10.3.1, zeebe-bpmn-moddle 2.0.0, Camunda 8.10.4 (`camunda/camunda`), Postgres 17.6. Angular runs zoneless (no zone.js).

## Repository layout (short)

```
apps/web        Angular 21 app
apps/api        NestJS 11 API
libs/shared     DTO interfaces, enums, constants shared by web + api
docker-compose.yml, .env.example
```
