#!/usr/bin/env bash
# Usage: ./scripts/subtree-pull.sh <package-name> [branch]
# Example: ./scripts/subtree-pull.sh todo-pwa-vite
#          ./scripts/subtree-pull.sh todo-api-nestjs feat/my-branch
set -euo pipefail

PACKAGE="${1:?Usage: subtree-pull.sh <package-name> [branch]}"
BRANCH="${2:-main}"

git subtree pull \
  --prefix="apps/${PACKAGE}" \
  "${PACKAGE}" \
  "${BRANCH}" \
  --squash \
  -m "chore: sync apps/${PACKAGE} from ${PACKAGE}@${BRANCH}"
