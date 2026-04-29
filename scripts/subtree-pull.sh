#!/usr/bin/env bash
# Usage: ./scripts/subtree-pull.sh <package-name> [branch]
#
# Examples:
#   ./scripts/subtree-pull.sh todo-pwa-vite              # pull todo-pwa-vite@main
#   ./scripts/subtree-pull.sh todo-api-nestjs            # pull todo-api-nestjs@main
#   ./scripts/subtree-pull.sh todo-api-nestjs feat/foo   # pull a feature branch
#
# Prerequisites — add each remote once before first use:
#   git remote add todo-pwa-vite https://github.com/jonpham/2026-project-todo-pwa-vite.git
#   git remote add todo-api-nestjs https://github.com/jonpham/2026-project-todo-api-nestjs.git
#
# After running this script:
#   1. Resolve any merge conflicts
#   2. Run: pnpm install --no-frozen-lockfile  (lockfile may need updating)
#   3. Open a PR — do NOT commit subtree syncs directly to main
#
# To push a change back upstream (rare):
#   git subtree push --prefix=apps/<package> <remote> <branch>
set -euo pipefail

PACKAGE="${1:?Usage: ./scripts/subtree-pull.sh <package> [branch]}"
BRANCH="${2:-main}"

# Ensure the remote exists
if ! git remote get-url "$PACKAGE" &>/dev/null; then
  echo "ERROR: remote '$PACKAGE' not found."
  echo "Add it with: git remote add $PACKAGE https://github.com/jonpham/$PACKAGE.git"
  exit 1
fi

git subtree pull \
  --prefix="apps/${PACKAGE}" \
  "${PACKAGE}" \
  "${BRANCH}" \
  --squash \
  -m "chore: sync apps/${PACKAGE} from ${PACKAGE}@${BRANCH}"

# Verify the subtree matches upstream — catch silent conflict-resolution drops
echo ""
echo "Verifying subtree matches upstream..."
UPSTREAM_REF="${PACKAGE}/${BRANCH}"
MISMATCH=0
while IFS= read -r -d '' file; do
  rel="${file#apps/${PACKAGE}/}"
  upstream_hash=$(git ls-tree -l "${UPSTREAM_REF}" -- "${rel}" 2>/dev/null | awk '{print $3}')
  local_hash=$(git ls-tree -l HEAD -- "apps/${PACKAGE}/${rel}" 2>/dev/null | awk '{print $3}')
  if [ -n "$upstream_hash" ] && [ "$upstream_hash" != "$local_hash" ]; then
    echo "  MISMATCH: apps/${PACKAGE}/${rel}"
    MISMATCH=1
  fi
done < <(git ls-tree -r --name-only -z "${UPSTREAM_REF}" 2>/dev/null | tr '\n' '\0')

if [ "$MISMATCH" -eq 1 ]; then
  echo ""
  echo "ERROR: Subtree diverges from upstream after pull."
  echo "Files above were likely dropped during merge conflict resolution."
  echo "Fix: git read-tree --prefix=apps/${PACKAGE} -u ${UPSTREAM_REF}"
  echo "     git add apps/${PACKAGE}/ && git commit -m 'fix: restore diverged files after subtree sync'"
  exit 1
fi

echo "Verified: apps/${PACKAGE} matches ${UPSTREAM_REF} exactly."
echo ""
echo "Sync complete: apps/$PACKAGE updated from $PACKAGE@$BRANCH"
echo "Next: pnpm install --no-frozen-lockfile && git add pnpm-lock.yaml && git commit -m 'chore: update lockfile after $PACKAGE sync'"
