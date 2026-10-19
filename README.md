# BPMN Studio

A web app to model, version and deploy BPMN processes for **Camunda 8 (Zeebe)**.

Create a process diagram in the browser, configure Zeebe properties (job types, I/O mappings, headers) in the side panel, save every change as an immutable version, import and export `.bpmn` files, and deploy to a Camunda 8 Orchestration Cluster.

> **Status:** in active development. Modeling, versioning, import/export and the editor are done; deploying to Camunda and the deployment log are next.

## Features

- **Models:** create, rename, duplicate and delete BPMN models.
- **Modeler:** [bpmn-js](https://bpmn.io/toolkit/bpmn-js/) editor with the Camunda 8 (Zeebe) properties panel, styled to match the app.
- **Versioning:** every save creates a new immutable version with an optional comment; browse history, preview any version and restore it as a new version.
- **Import / export:** upload `.bpmn` / `.xml` files as new models or into the editor; download any version.
- **Validation:** BPMN XML is checked (well-formed, parses with the Zeebe moddle, has a process) before it is stored.
- **Safety:** unsaved-changes indicator and a prompt before leaving the editor.
- **Deploy to Camunda 8** _(coming next)_: deploy a version to the Orchestration Cluster and keep a deployment log.

## Tech stack

| Area     | Technology                                                                             |
| -------- | -------------------------------------------------------------------------------------- |
| Monorepo | [Nx](https://nx.dev) 22 + pnpm                                                         |
| Frontend | Angular 21 (standalone, signals, zoneless, OnPush), Tailwind CSS v4                    |
| Backend  | NestJS 11, TypeORM (migrations), PostgreSQL 17, class-validator, Swagger               |
| BPMN     | bpmn-js 18, bpmn-js-properties-panel 5, zeebe-bpmn-moddle 2, camunda-bpmn-js-behaviors |
| Engine   | Camunda 8.10 Orchestration Cluster (REST API v2)                                       |
| Tests    | Vitest (web), Jest (api)                                                               |

## Project structure

```
apps/
  web/        Angular 21 app (models list, version history, editor)
  api/        NestJS 11 REST API (models, versions, import/export, health)
libs/
  shared/     DTOs, constants and helpers shared by web and api
docker-compose.yml   PostgreSQL + local Camunda 8 cluster (no auth)
```

## Getting started

### Prerequisites

- Node.js **22.12+** (see `.nvmrc`)
- pnpm **10**
- Docker (for PostgreSQL and Camunda)

### Setup

```bash
git clone https://github.com/tliliAbdelmonem/bpmn-studio.git
cd bpmn-studio
pnpm install
cp .env.example .env          # adjust if needed

pnpm infra:up                 # PostgreSQL + Camunda 8.10
pnpm nx run api:migration:run # create the database schema
pnpm start:api                # http://localhost:3000/api
pnpm start:web                # http://localhost:4200
```

Open http://localhost:4200 and create your first model.

### Local URLs

| Service             | URL                                         |
| ------------------- | ------------------------------------------- |
| Web app             | http://localhost:4200                       |
| API                 | http://localhost:3000/api                   |
| API docs (Swagger)  | http://localhost:3000/api/docs              |
| Camunda REST API v2 | http://localhost:8080/v2                    |
| Camunda Operate     | http://localhost:8080/operate (demo / demo) |

## Configuration

Environment variables (see `.env.example`):

| Name                  | Default                    | Description                                        |
| --------------------- | -------------------------- | -------------------------------------------------- |
| `PORT`                | `3000`                     | API port                                           |
| `DATABASE_URL`        | _required_                 | PostgreSQL connection string                       |
| `CAMUNDA_BASE_URL`    | `http://localhost:8080/v2` | Camunda Orchestration Cluster REST API v2          |
| `CORS_ORIGIN`         | _unset_                    | Allowed origins, only needed without the dev proxy |
| `MAX_BPMN_SIZE_BYTES` | `5242880` (5 MB)           | Max upload / request body size                     |

The API validates its configuration at startup and refuses to start with invalid values.

## API overview

All routes are under `/api`. Errors use [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) `application/problem+json`. Full documentation is in Swagger at `/api/docs`.

| Method | Route                             | Description                               |
| ------ | --------------------------------- | ----------------------------------------- |
| GET    | `/health`                         | API, database and Camunda status          |
| GET    | `/models`                         | List models                               |
| POST   | `/models`                         | Create a model (blank diagram or XML)     |
| POST   | `/models/import`                  | Create a model from a `.bpmn` file        |
| GET    | `/models/:id`                     | Get a model                               |
| PATCH  | `/models/:id`                     | Rename / update description               |
| DELETE | `/models/:id`                     | Delete a model and its versions           |
| POST   | `/models/:id/duplicate`           | Copy the current version into a new model |
| GET    | `/models/:id/versions`            | List versions (newest first)              |
| POST   | `/models/:id/versions`            | Save a new version                        |
| GET    | `/models/:id/versions/:n`         | Get a version with its XML                |
| POST   | `/models/:id/versions/:n/restore` | Restore version `n` as a new version      |
| GET    | `/models/:id/versions/:n/export`  | Download version `n` as `.bpmn`           |

## Scripts

```bash
pnpm build           # build all projects
pnpm lint            # lint all projects
pnpm test            # run all unit tests
pnpm format:check    # check formatting (Prettier)
pnpm infra:down      # stop PostgreSQL and Camunda

pnpm nx run api:migration:generate --name=<Name>   # then register it in apps/api/src/database/migrations/index.ts
pnpm nx run api:migration:run
pnpm nx run api:migration:revert
pnpm nx run api:migration:show
```

## Contributing

Conventions for code style, architecture and the bpmn-js integration are in [CLAUDE.md](CLAUDE.md); the phased plan and design decisions are in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

## License and credits

The diagram editor is built on [bpmn-js](https://github.com/bpmn-io/bpmn-js) by bpmn.io, whose license requires the bpmn.io watermark to stay visible in the editor.
