# IMPLEMENTATION_PLAN.md — BPMN Studio

Status: **Phase 1 (scaffolding) done, awaiting approval for Phase 2.**

Decisions taken at Phase 0 approval (defaults accepted): Q1 official lightweight compose trimmed to the orchestration service, Camunda 8.10.4; Q2 zoneless; Q3 no SSR; Q6 delete cascades deployments; Q7 duplicate copies current version only; Q8 restore = new version; Q11 Vitest (web) / Jest (api); Q12 Node 22; Q13 TypeORM 0.3.31; Q14 code lives in the shared project folder until a repository is named.

Each phase ends with: summary, verification checklist, explicit "go" before the next phase.

---

## 1. Architecture at a glance

```
Browser (Angular 21, :4200)
  └─ ApiService ──HTTP /api──▶ NestJS 11 API (:3000)
                                ├─ ModelsModule / VersionsModule ─▶ PostgreSQL (TypeORM, migrations)
                                ├─ BpmnXmlValidator (bpmn-moddle + zeebe-bpmn-moddle)
                                └─ CamundaClientService ──multipart──▶ Camunda 8 cluster ${CAMUNDA_BASE_URL}/deployments
```

Web dev server proxies `/api` to the API, so no CORS is needed in dev.

## 2. Data model

| Entity                                    | Columns                                                                                                                                                                          | Notes                                                                                |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `BpmnModel` (`bpmn_model`)                | `id uuid pk`, `name varchar(200)`, `description text null`, `processId varchar null`, `currentVersionNumber int`, `createdAt`, `updatedAt`                                       | `processId` extracted from the latest saved XML (first executable `bpmn:Process@id`) |
| `BpmnModelVersion` (`bpmn_model_version`) | `id uuid pk`, `modelId fk → bpmn_model ON DELETE CASCADE`, `versionNumber int`, `xml text`, `comment text null`, `createdAt`                                                     | `UNIQUE(modelId, versionNumber)`; no update path in code                             |
| `Deployment` (`deployment`)               | `id uuid pk`, `modelVersionId fk → bpmn_model_version ON DELETE CASCADE`, `status enum('SUCCESS','FAILED')`, `camundaResponse jsonb null`, `errorMessage text null`, `createdAt` | index on `modelVersionId`                                                            |

Version numbering: new version = `currentVersionNumber + 1`, done in a transaction with a row lock on the model (`SELECT … FOR UPDATE`) so concurrent saves can't collide; the unique constraint is the backstop (mapped to 409).

## 3. REST API (`/api`)

| Method | Path                              | Behaviour                                                                            |
| ------ | --------------------------------- | ------------------------------------------------------------------------------------ |
| GET    | `/models`                         | list with current version number, processId, updatedAt                               |
| POST   | `/models`                         | `{name, description?, xml?}`; no xml → minimal Zeebe template; creates v1            |
| GET    | `/models/:id`                     | model + current version metadata                                                     |
| PATCH  | `/models/:id`                     | rename / description only                                                            |
| DELETE | `/models/:id`                     | cascades versions + deployment log                                                   |
| POST   | `/models/:id/duplicate`           | new model "`<name> (copy)`", v1 = source's current XML                               |
| GET    | `/models/:id/versions`            | list without xml                                                                     |
| GET    | `/models/:id/versions/:n`         | with xml                                                                             |
| POST   | `/models/:id/versions`            | `{xml, comment?}` → validate → new version                                           |
| POST   | `/models/:id/versions/:n/restore` | copies version n into a new version, comment "Restored from vN"                      |
| POST   | `/models/import`                  | multipart `file` (.bpmn/.xml, size-limited) → new model, name from file/process name |
| GET    | `/models/:id/versions/:n/export`  | `application/xml`, `Content-Disposition: attachment; filename="<name>-v<n>.bpmn"`    |
| POST   | `/models/:id/versions/:n/deploy`  | Phase 5; always writes a `Deployment` row                                            |
| GET    | `/models/:id/deployments`         | newest first, joined with version number                                             |
| GET    | `/health`                         | DB ping (+ Camunda `/topology` reachability, reported but not fatal)                 |

Errors: RFC 9457 problem+json. Mapped cases: 400 validation, 404 not found, 409 version conflict, 413 file too large, 415 wrong file type, 422 invalid BPMN (with parser warnings in `errors`), 502 Camunda unreachable/error.

XML validation: reject if empty, not well-formed, root isn't `bpmn:definitions`, `bpmn-moddle` reports errors, or there is no `bpmn:Process`. Moddle warnings (unknown elements) are returned but don't block. Also refuse DOCTYPE/entities (XXE hygiene even though moddle uses saxen, which doesn't resolve entities).

## 4. File tree (target)

```
.
├── CLAUDE.md
├── IMPLEMENTATION_PLAN.md
├── README.md                         (Phase 6)
├── docker-compose.yml
├── .env.example
├── nx.json  package.json  pnpm-workspace.yaml  tsconfig.base.json
├── eslint.config.mjs  .prettierrc  .prettierignore  .editorconfig
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── main.ts                       (prefix, ValidationPipe, Swagger, filter)
│   │   │   ├── app.module.ts
│   │   │   ├── config/ env.validation.ts, configuration.ts
│   │   │   ├── database/ data-source.ts, migrations/
│   │   │   ├── common/ problem-details.filter.ts, problem-details.ts
│   │   │   ├── health/ health.controller.ts
│   │   │   ├── bpmn/ bpmn-xml.validator.ts, bpmn-template.ts (+ .spec)
│   │   │   ├── models/
│   │   │   │   ├── entities/ bpmn-model.entity.ts, bpmn-model-version.entity.ts
│   │   │   │   ├── dto/ create-model.dto.ts, update-model.dto.ts, create-version.dto.ts, …
│   │   │   │   ├── models.controller.ts, models.service.ts (+ .spec)
│   │   │   │   ├── versions.controller.ts, versions.service.ts (+ .spec)
│   │   │   │   └── import-export.controller.ts
│   │   │   └── deployments/                  (Phase 5)
│   │   │       ├── deployment.entity.ts
│   │   │       ├── camunda-client.service.ts (+ .spec)
│   │   │       ├── deployments.service.ts (+ .spec), deployments.controller.ts
│   │   └── project.json, tsconfig*.json, jest/vitest config
│   ├── web/
│   │   ├── src/
│   │   │   ├── main.ts, index.html, styles.css, bpmn.d.ts
│   │   │   └── app/
│   │   │       ├── app.ts, app.config.ts, app.routes.ts
│   │   │       ├── core/ api.service.ts, toast.service.ts, unsaved-changes.guard.ts
│   │   │       ├── shared/ ui/ (button, dialog, toast-outlet, empty-state…)
│   │   │       ├── bpmn/
│   │   │       │   ├── bpmn-modeler.component.ts   (Modeler + Zeebe properties panel)
│   │   │       │   ├── bpmn-viewer.component.ts    (NavigatedViewer, read-only)
│   │   │       │   └── new-diagram.ts              (or imported from libs/shared)
│   │   │       └── features/
│   │   │           ├── models-list/ models-list.page.ts
│   │   │           ├── model-editor/ model-editor.page.ts
│   │   │           ├── model-versions/ model-versions.page.ts
│   │   │           └── model-deployments/ model-deployments.page.ts
│   │   └── proxy.conf.json, project.json
│   └── web-e2e/                               (Phase 6, Playwright)
└── libs/shared/src/
    ├── index.ts
    └── lib/ model.dto.ts, version.dto.ts, deployment.dto.ts, problem-details.ts, constants.ts
```

## 5. Phases

### Phase 1 — Scaffolding

- `create-nx-workspace` (pnpm, integrated), `@nx/angular` app `web` (Angular 21, standalone, no SSR, esbuild), `@nx/nest` app `api` (Nest 11), `@nx/js` lib `shared` with path alias `@bpmn-studio/shared`.
- Tailwind v4 via `@tailwindcss/postcss` + `.postcssrc.json`, `@import "tailwindcss";` in `styles.css`.
- `ApiService` skeleton + `provideHttpClient(withFetch())`, app shell (header + `<router-outlet>`), lazy route stubs.
- API: `@nestjs/config` + validation schema, TypeORM wired to Postgres (`synchronize:false`, empty migrations dir), problem-details filter, Swagger at `/api/docs`, `GET /api/health`.
- `docker-compose.yml`: `postgres:<pinned>` + Camunda 8 (see Q1), `.env.example`.
- ESLint (flat config) + Prettier, Angular ESLint rules enforcing OnPush/prefer-standalone/no constructor injection where available.
- **Verify:** `docker compose up -d` healthy; `nx build web`, `nx build api` pass; `nx serve api` → `/api/health` 200 and `/api/docs` loads; `nx serve web` shows the shell; `nx run-many -t lint` clean.

### Phase 2 — Backend

- Entities + first migration; models/versions CRUD; duplicate; restore; import (multer, size + extension check) / export; XML validator + Zeebe template; processId extraction; problem-details mapping; Swagger decorators on all endpoints.
- Unit tests: `ModelsService`, `VersionsService` (version increment, immutability, restore), `BpmnXmlValidator` (valid, malformed, non-BPMN, no process), import filename/size handling.
- **Verify:** migration runs on a clean DB; all endpoints exercised via Swagger; tests green.

### Phase 3 — Frontend CRUD

- `/models` list: table/cards, create (dialog), rename, duplicate, delete (confirm `<dialog>`), import button.
- `/models/:id/versions`: version list, read-only preview with `BpmnViewerComponent` (NavigatedViewer), restore with confirm, export per version.
- Toasts, loading and empty states; all via `ApiService`.
- **Verify:** full CRUD in the browser; previews render any version; restore creates a new version.

### Phase 4 — Modeler

- `BpmnModelerComponent`: inputs `xml`, outputs `changed`, `dirtyChange`, `error`; exposes `saveXML()`; Zeebe properties panel (`BpmnPropertiesPanelModule`, `BpmnPropertiesProviderModule`, `ZeebePropertiesProviderModule`, `ZeebeBehaviorsModule`, `zeebe` moddle extension).
- `/models/:id/edit`: toolbar (Save as new version + optional comment, Deploy (disabled until Phase 5), Export, Import into current model), canvas + panel side by side, dirty indicator, `CanDeactivate` guard + `beforeunload`.
- **Verify:** create a service task with a job type, save, reload → properties persisted as `zeebe:` extensions; leaving with unsaved changes prompts; bpmn.io logo visible.

### Phase 5 — Camunda deployment

- `CamundaClientService` (native `fetch` + `FormData` + `Blob`, timeout via `AbortSignal.timeout`), deploy endpoint, `Deployment` entity + migration, deployments list endpoint.
- UI: Deploy button with success/error toast, `/models/:id/deployments` log (status, timestamp, process definition key/version from response, error).
- **Verify:** deploy a model to the local cluster, `Deployment` row SUCCESS with response; process visible in Operate; deploy an invalid-for-Zeebe model (e.g. service task without job type) → FAILED row with Camunda's error.

### Phase 6 — Hardening

- Error handling pass (network down, Camunda down, 404s, oversized files), consistent toasts.
- Playwright e2e smoke: create → edit → save → view history → restore → export → deploy (deploy step skippable if cluster not running, via env flag).
- README: prerequisites, setup, commands, env vars, troubleshooting.

## 6. Dependencies (each justified; exact versions pinned in Phase 1)

| Package                                                            | Why                                                                                           |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `bpmn-js` (18.x, pinned)                                           | Modeler + NavigatedViewer                                                                     |
| `bpmn-js-properties-panel` (5.x, pinned)                           | Properties panel incl. Zeebe provider                                                         |
| `@bpmn-io/properties-panel` (3.x, pinned)                          | Required peer (≥ 3.42) of the panel; provides its CSS                                         |
| `camunda-bpmn-js-behaviors` (1.x, pinned)                          | Required peer of the Zeebe properties provider; keeps `zeebe:` extensions consistent on edits |
| `zeebe-bpmn-moddle` (pinned, see Q4)                               | Zeebe extension namespace for modeler and backend validation                                  |
| `bpmn-moddle` (API, pinned)                                        | Server-side BPMN parsing/validation without a browser                                         |
| `@nestjs/typeorm`, `typeorm`, `pg`                                 | ORM + driver                                                                                  |
| `@nestjs/config` + `joi` _or_ class-validator-based env validation | Env validation (default: class-validator, already in stack, no joi)                           |
| `@nestjs/swagger`                                                  | `/api/docs`                                                                                   |
| `class-validator`, `class-transformer`                             | DTO validation                                                                                |
| `tailwindcss`, `@tailwindcss/postcss`, `postcss`                   | Tailwind v4 in Angular                                                                        |
| `@playwright/test` (Phase 6)                                       | e2e smoke                                                                                     |

No HTTP client lib on the API (Node 22 native `fetch`); no UI component library.

## 7. Risks

1. **Angular 21 is zoneless by default.** `NgZone.runOutsideAngular` is effectively a no-op without zone.js. bpmn-js event listeners won't trigger change detection either way; we bridge to signals explicitly. See Q2.
2. **Version drift.** npm `latest` is Angular 22 / NestJS 12 / Nx 23; Nx must be a version whose `@nx/angular` supports Angular 21 (exact match checked in Phase 1). Generators may default to newer majors, so all installs use explicit majors.
3. **`zeebe-bpmn-moddle` 2.0.0** was released Aug 2026 (major). The properties panel / behaviors peers accept it, but breaking changes must be checked; fallback is the latest 1.x.
4. **Properties panel CSS/layout** needs a fixed-height container; flex layouts collapse the canvas to 0px if not careful.
5. **Camunda API differences across 8.x minors** (path, auth, response shape of `/v2/deployments`). Mitigated by isolating calls in `CamundaClientService` and checking the running cluster's OpenAPI spec before Phase 5.
6. **Local cluster weight.** Full Camunda Docker Compose (Elasticsearch/OpenSearch etc.) needs several GB RAM; Camunda 8 Run or the lightweight compose variant is preferred.
7. **Large XML in list endpoints**: versions list never returns `xml`.
8. **Immutability** relies on the service layer; optionally add a DB trigger rejecting `UPDATE` on `bpmn_model_version` (Q7).

## 8. Open questions (defaults I'll use unless you say otherwise)

1. **Local Camunda: Camunda 8 Run or the official Docker Compose?** Which 8.x version? Default: the official lightweight Docker Compose for the latest 8.x minor (orchestration cluster image incl. Zeebe + Operate + Tasklist, H2/RDBMS or Elasticsearch per that release), with exact image tags pinned after checking Camunda's docs in Phase 1. Operate expected at `http://localhost:8080/operate`. Postgres for our app runs as a separate service on 5432 in the same compose file.
2. **Zoneless vs zone.js:** keep Angular 21's zoneless default and treat `runOutsideAngular` as a defensive wrapper (harmless), or add zone.js so it is meaningful? Default: zoneless, still wrap bpmn-js construction in `runOutsideAngular` as you specified.
3. **SSR:** none planned; `isPlatformBrowser` guard kept anyway. OK?
4. **zeebe-bpmn-moddle 2.x vs 1.x:** default 2.x if the panel works with it in Phase 4, else latest 1.x.
5. **Deploy auth:** local cluster without auth. Should `CamundaClientService` already support optional OAuth (client credentials) / basic auth env vars for SaaS/Self-Managed later? Default: no, just an injectable header hook.
6. **Delete model with deployments:** cascade-delete the deployment log too (default), or block deletion / soft-delete?
7. **Duplicate:** copy only the current version as v1 of the new model (default), or full history?
8. **Restore:** creates a new version from the old XML (default; versions stay immutable). Confirm.
9. **processId uniqueness:** two models can deploy the same `processId` and Camunda will treat them as versions of one process. Warn in UI, enforce uniqueness, or ignore? Default: warn only.
10. **Import into an existing model** (modeler toolbar) creates a new version of that model on save; `POST /models/import` creates a new model. Confirm.
11. **Test runner:** Angular 21 defaults to Vitest; Nest defaults to Jest. Default: Vitest for web and shared, Jest for API (Nest default).
12. **Node version:** default Node 22 LTS (`.nvmrc`). Or 24?
13. **TypeORM 0.3.x vs 1.x:** `@nestjs/typeorm` supports both; default latest 0.3.x for stability unless you prefer 1.x.
14. **Repository:** none is attached to this project yet. Where should Phase 1 code live (a GitHub repo to attach, or the shared project folder)?
