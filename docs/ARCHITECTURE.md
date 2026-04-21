# Project Architecture

## Repository Structure

```
[repo-name]/
├── CLAUDE.md                        # This file
├── docs/
│   ├── features/                    # Source of truth for all phases & steps
│   │   ├── _TEMPLATE.md             # Feature doc template
│   │   └── [STATUS]GH{n}_{slug}.md  # One file per phase
│   ├── ARCHITECTURE.md
│   └── DECISIONS.md                 # Architecture Decision Records
├── apps/
│   └── todo-pwa/                    # Vite + React 19 PWA
│       ├── .storybook/              # Storybook config (main.ts, preview.ts)
│       ├── e2e/                     # Playwright E2E tests
│       ├── src/
│       │   ├── App.tsx
│       │   ├── App.test.tsx         # Vitest unit smoke test
│       │   ├── App.stories.tsx      # Storybook Default story
│       │   ├── test-setup.ts        # @testing-library/jest-dom setup
│       │   ├── main.tsx
│       │   └── index.css            # Tailwind CSS v4 entry
│       ├── index.html
│       ├── playwright.config.ts
│       ├── vite.config.ts           # Vitest: unit (jsdom) + storybook (Chromium) projects
│       └── package.json
├── packages/                        # Shared libraries
│   └── types/                       # Shared TypeScript types
├── .github/
│   ├── workflows/                   # GitHub Actions CI/CD
│   └── PULL_REQUEST_TEMPLATE.md     # PR checklist
├── .claude/
│   └── commands/                    # Custom Claude Code slash commands
│       ├── bootstrap.md                  # /project:bootstrap
│       ├── plan_project.md               # /project:plan_project
│       ├── develop.md                    # /project:develop
│       ├── update-status-and-commit.md   # /project:update-status-and-commit
│       └── update-docs-and-push.md       # /project:update-docs-and-push
├── package.json                     # Root pnpm workspace config
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.json
```

---
