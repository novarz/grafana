#!/usr/bin/env bash
# Reset novarz/grafana to a clean 101+201 starting state (git + GitHub).
# Jira is not done here — the reset-demo skill / next agent does that via MCP.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

KEEP_PR_BRANCH="${KEEP_PR_BRANCH:-cursor/track-cursor-skills-for-cloud-agents}"
CLOSE_PRS=1
DRY_RUN=0
export GH_REPO="${GH_REPO:-novarz/grafana}"

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --no-close-prs) CLOSE_PRS=0 ;;
    --keep-pr-branch=*) KEEP_PR_BRANCH="${arg#*=}" ;;
    -h|--help)
      cat <<'EOF'
Usage: .cursor/reset-demo.sh [--dry-run] [--no-close-prs]

Restores demo source files, wipes live /create-rule artifacts, closes
cursor/* demo PRs (except KEEP_PR_BRANCH). Does not start Grafana.
Does not touch Jira (use the reset-demo skill).
EOF
      exit 0
      ;;
    *)
      echo "unknown arg: $arg" >&2
      exit 2
      ;;
  esac
done

run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf 'dry-run:'
    printf ' %q' "$@"
    printf '\n'
  else
    "$@"
  fi
}

echo "== git =="
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "working tree dirty — restoring known demo paths only, not git reset --hard"
fi

DEMO_PATHS=(
  public/app/core/components/AppChrome/TopBar/SingleTopBar.tsx
  public/app/core/components/AppChrome/TopBar/ThemeToggle.tsx
  public/app/core/components/AppChrome/TopBar/ThemeToggle.test.tsx
  public/app/core/components/AppChrome/AppChrome.tsx
  public/app/core/components/AppChrome/TopBar/useChromeHeaderHeight.ts
)

for p in "${DEMO_PATHS[@]}"; do
  if git ls-files --error-unmatch "$p" >/dev/null 2>&1; then
    run git restore --worktree --staged -- "$p" || true
  else
    run rm -f "$p"
  fi
done

run rm -f \
  public/app/core/components/AppChrome/TopBar/ThemeToggle.tsx \
  public/app/core/components/AppChrome/TopBar/ThemeToggle.test.tsx \
  WEBHOOK_SMOKE.txt
run rm -rf docs/demo-screenshots
# .cursor/rules is tracked; rm -rf alone leaves staged or committed files as deletions.
run git rm -r -f --ignore-unmatch -- .cursor/rules || true
run rm -rf .cursor/rules
run mkdir -p .cursor/rules
run rm -rf .cursor/skills/colocated-react-tests

echo "== github cursor/* PRs =="
if [[ "$CLOSE_PRS" -eq 1 ]]; then
  if ! command -v gh >/dev/null; then
    echo "gh not found — close cursor/* PRs by hand" >&2
  else
    while IFS=$'\t' read -r num head; do
      [[ -z "${num:-}" ]] && continue
      if [[ "$head" == "$KEEP_PR_BRANCH" ]]; then
        echo "keep PR #$num ($head)"
        continue
      fi
      echo "close PR #$num ($head)"
      run gh pr close "$num" --repo novarz/grafana --comment "Demo reset — re-run 101/201 from a clean slate." || true
      run git push origin --delete "$head" || true
    done < <(gh pr list --repo novarz/grafana --state open --limit 50 --json number,headRefName --jq '.[] | select(.headRefName|startswith("cursor/")) | [.number,.headRefName] | @tsv')
  fi
fi

echo "== grafana =="
code="$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/login || true)"
if [[ "$code" == "200" ]]; then
  echo "localhost:3000 login -> 200 (leave it; do not restart from an agent tab)"
else
  echo "localhost:3000 login -> ${code:-down}. Human starts Grafana in a login terminal: yarn start (compiled) then make run / ./bin/grafana server"
fi

echo
echo "Jira still to do (reset-demo skill): only SDFD-1 and SDFD-2 assigned, all To Do, nothing In Progress."
echo "Done."
