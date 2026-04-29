# `@todo-skeleton/types`

`@todo-skeleton/types` is published from the monorepo to GitHub Packages. The package is the shared wire-contract source for Todo schemas and types.

## Publish behavior

- Workflow: `.github/workflows/publish-todo-types.yml`
- Trigger: push to `main` only when `packages/todo-types/**` changes
- Registry: `https://npm.pkg.github.com`
- Package name: `@todo-skeleton/types`
- Versioning: patch-only auto bump during publish

The workflow installs only `@todo-skeleton/types` and its dependency closure, with lifecycle scripts disabled so unrelated monorepo hooks do not run on the publish path. It then runs package lint/test/build, checks for a commit-scoped version reservation tag, looks up the latest published package version in GitHub Packages when needed, reserves the chosen version for `github.sha`, and publishes that reserved version. If the same commit is rerun, the workflow reuses the existing reservation instead of minting another patch version. It then checks whether that reserved version is already present in GitHub Packages: if it is already present, the workflow skips publish cleanly; if it is not present, the workflow publishes the same reserved version. If the package has not been published yet and GitHub Packages returns a not-found response for the latest-version lookup, the workflow falls back to the version in `packages/todo-types/package.json` and bumps that patch value. Other registry lookup failures, including auth or network errors, fail the job instead of using the fallback path.

The version bump happens inside CI only. The workflow does not commit the bumped `package.json` back to `main`.

## Workflow requirements

The publish job uses the repository `GITHUB_TOKEN` and requires:

- `contents: write`
- `packages: write`

`contents: write` is required because the workflow writes and pushes the commit-scoped version reservation tag before publish.

No extra publish secret is required when the package is published from this repository to GitHub Packages.

## Consumer setup

Consumers need GitHub Packages registry configuration for the `@todo-skeleton` scope.

`.npmrc`

```ini
@todo-skeleton:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Install a published version with pnpm:

```bash
pnpm add @todo-skeleton/types@0.1.1
```

Install a published version with npm:

```bash
npm install @todo-skeleton/types@0.1.1
```

For local development in GitHub Actions, set `GITHUB_TOKEN` in the job environment. For developer machines or external repos, use a personal access token with package read access.

## Local release utility

The patch bump helper lives at `scripts/release/bump-todo-types-version.mjs`. It mutates the target `package.json` in place and prints the new version to stdout.

Example:

```bash
node scripts/release/bump-todo-types-version.mjs
```

Optional flags:

- `--base-version <x.y.z>`: bump from an explicit version instead of the current package manifest version
- `--package-json <path>`: target a different `package.json`, useful for local verification

The script validates flag operands before reading or writing files. Missing values such as `--base-version` with no version now fail fast instead of falling through to mutate the target manifest.
