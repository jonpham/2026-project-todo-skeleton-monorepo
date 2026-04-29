#!/usr/bin/env bash
# subtree-sync.sh — Pull upstream changes from a subtree remote into this monorepo.
#
# Usage:
#   ./subtree-sync.sh <package> [branch]
#
# Examples:
#   ./subtree-sync.sh todo-pwa-vite              # pull todo-pwa-vite@main
#   ./subtree-sync.sh todo-api-nestjs            # pull todo-api-nestjs@main
#   ./subtree-sync.sh todo-api-nestjs feat/foo   # pull a feature branch
#
# Prerequisites:
#   The remote must be added before first use:
#     git remote add todo-pwa-vite https://github.com/jonpham/2026-project-todo-pwa-vite.git
#     git remote add todo-api-nestjs https://github.com/jonpham/2026-project-todo-api-nestjs.git
#
# After running this script:
#   1. Resolve any merge conflicts
#   2. Run: pnpm install --no-frozen-lockfile  (lockfile may need updating)
#   3. Open a PR — do NOT commit subtree syncs directly to main
#
# To push a change back upstream (rare):
#   git subtree push --prefix=apps/<package> <remote> <branch>
#
set -euo pipefail

PACKAGE="${1:?Usage: ./subtree-sync.sh <package> [branch]}"
BRANCH="${2:-main}"

# Ensure the remote exists
if ! git remote get-url "$PACKAGE" &>/dev/null; then
  echo "ERROR: remote '$PACKAGE' not found."
  echo "Add it with: git remote add $PACKAGE https://github.com/jonpham/$PACKAGE.git"
  exit 1
fi

./scripts/subtree-pull.sh "$PACKAGE" "$BRANCH"
echo ""
echo "Sync complete: apps/$PACKAGE updated from $PACKAGE@$BRANCH"
echo "Next: pnpm install --no-frozen-lockfile && git add pnpm-lock.yaml && git commit -m 'chore: update lockfile after $PACKAGE sync'"
