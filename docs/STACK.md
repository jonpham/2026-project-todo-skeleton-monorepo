# Stack — todo-api-nestjs

## Runtime

| Layer | Choice | Version | Notes |
|---|---|---|---|
| Runtime | Node.js | 22 LTS | Required by NestJS v11 |
| Language | TypeScript | ^5.4 | Strict mode, ES2022, NodeNext |
| Framework | NestJS | ^11.0 | Decorator-based MVC framework |
| HTTP Adapter | Express (via platform-express) | bundled | Default NestJS adapter |

## Toolchain

| Tool | Purpose | Config File |
|---|---|---|
| pnpm | Package manager | `package.json` (`packageManager`) |
| tsc | TypeScript compiler | `tsconfig.json`, `tsconfig.build.json` |
| Vitest | Unit & integration testing | `vitest.config.ts` |
| ESLint | Linting (flat config) | `eslint.config.js` |
| Prettier | Code formatting | `.prettierrc` |
| Husky | Git hooks | `.husky/pre-commit` |
| lint-staged | Pre-commit lint + format | `package.json` (`lint-staged`) |

## Key Design Decisions

- **NodeNext module resolution** — required for native ESM compatibility with Node.js 22+; imports use `.js` extensions.
- **Vitest over Jest** — faster, native TypeScript support, compatible with NestJS testing patterns.
- **ESLint flat config** — `eslint.config.js` (not `.eslintrc`) to align with ESLint v9+ and the monorepo parent.
- **No ORM yet** — database integration is deferred to Phase 2 (TypeORM + SQLite).
- **No auth yet** — JWT/auth middleware is deferred to Phase 3.

## Deferred to Later Phases

| Phase | Addition |
|---|---|
| Phase 2 | TypeORM + SQLite, Todo entity & CRUD endpoints |
| Phase 3 | JWT authentication, guards, user entity |
| Phase 4 | Docker, health checks, production deployment |
