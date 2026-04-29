# Architecture — todo-api-nestjs

## Overview

`todo-api-nestjs` is a standalone REST API built with NestJS v11 and TypeScript. It follows NestJS's module-based architecture: each domain concern (todos, users, auth) is encapsulated in its own module, with controllers handling HTTP routing and services containing business logic.

## Module Structure (planned)

```
AppModule (root)
├── TodosModule      (Phase 2)
│   ├── TodosController
│   └── TodosService
├── UsersModule      (Phase 3)
│   ├── UsersController
│   └── UsersService
└── AuthModule       (Phase 3)
    ├── AuthController
    └── AuthService
```

## Phase 1 (current) — Minimal Bootstrap

```
src/
├── main.ts          # NestFactory.create(AppModule), listen on PORT
└── app.module.ts    # Root @Module, no imports yet
```

The Phase 1 scaffold contains no controllers, services, or business logic. It exists to validate the toolchain (TypeScript compilation, ESLint, Vitest, Prettier, Husky) and CI pipeline.

## Request Lifecycle

```
HTTP Request
  → Express (platform-express)
    → NestJS Router (Controller decorator)
      → Guard (Phase 3: JWT auth)
        → Pipe (validation, Phase 2+)
          → Service (business logic)
            → TypeORM Repository (Phase 2: database)
              → HTTP Response
```

## Data Flow (Phase 2+)

- **DTOs** validate and type incoming request bodies (class-validator)
- **Services** own business logic and call repositories
- **Repositories** interact with the SQLite database via TypeORM
- **Entities** define the database schema

## Environment Configuration

All environment variables are documented in `.env.example`:

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | HTTP server port | `3000` |
| `NODE_ENV` | Runtime environment | `development` |
| `DATABASE_URL` | SQLite connection string | `sqlite://./todo.db` |
| `JWT_SECRET` | JWT signing secret | _(required in prod)_ |

## Testing Strategy

- **Unit tests** (`*.spec.ts`) — test services and controllers in isolation using NestJS `Test.createTestingModule()`
- **Coverage** — `pnpm test:coverage` generates lcov + HTML reports
- **CI** — GitHub Actions runs lint + test + build on every push

## Conventions

- NodeNext module resolution: all relative imports use `.js` extension (compiled output)
- Strict TypeScript: no `any`, explicit return types on public methods
- One module per domain concern
- No business logic in controllers (delegate to services)
