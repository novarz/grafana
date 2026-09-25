#!/usr/bin/env bash
# Reset novarz/grafana to a clean 101+201 starting state (git + GitHub).
# Jira is not done here — the reset-demo skill / next agent does that via MCP.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CLOSE_PRS=1
DRY_RUN=0
FORCE_PUSH_MAIN=0
# Frozen clean start. origin/main is wrong after an accidental SDFD merge.
PIN_REF="${DEMO_BASELINE:-origin/demo/start}"
export GH_REPO="${GH_REPO:-novarz/grafana}"

KEEP_SKILLS=(
  add-e2e-selectors
  frontend-testing-strategy
  panel-testing-strategy
  reset-demo
)

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --no-close-prs) CLOSE_PRS=0 ;;
    --to-main) PIN_REF=origin/main ;;
    --force-push-main) FORCE_PUSH_MAIN=1 ;;
    -h|--help)
      cat <<'EOF'
Usage: .cursor/reset-demo.sh [--dry-run] [--no-close-prs] [--to-main] [--force-push-main]

Pins local main to origin/demo/start (clean demo, no SDFD-1/2/28).
--to-main            pin to origin/main instead (after you moved demo/start)
--force-push-main    also reset GitHub main to that pin (undo accidental merge)

Wipes live /create-rule and /create-skill output, closes leftover cursor/* PRs.
Does not start Grafana. Does not touch Jira. Leaves demo/sdfd-1-backup.
After kit-only updates on main: git push origin origin/main:demo/start
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

echo "== pin ${PIN_REF} =="
run git fetch origin main demo/start
if ! git rev-parse --verify "$PIN_REF" >/dev/null 2>&1; then
  echo "$PIN_REF missing — falling back to origin/main" >&2
  PIN_REF=origin/main
fi
echo "pin to $PIN_REF $(git rev-parse --short "$PIN_REF")"
# -B from a remote-tracking ref would retarget main's upstream; keep origin/main.
run git checkout --force --no-track -B main "$PIN_REF"
run git branch --set-upstream-to=origin/main
run git clean -fd -- \
  public/app/core/components/AppChrome \
  public/app/features/explore/Graph

run rm -f \
  public/app/core/components/AppChrome/TopBar/ThemeToggle.tsx \
  public/app/core/components/AppChrome/TopBar/ThemeToggle.test.tsx \
  WEBHOOK_SMOKE.txt
run rm -rf docs/demo-screenshots .cursor/rules
run mkdir -p .cursor/rules

echo "== wipe live skills (keep tracked kit) =="
if [[ -d .cursor/skills ]]; then
  for dir in .cursor/skills/*/; do
    [[ -d "$dir" ]] || continue
    name="$(basename "$dir")"
    keep=0
    for k in "${KEEP_SKILLS[@]}"; do
      if [[ "$name" == "$k" ]]; then
        keep=1
        break
      fi
    done
    if [[ "$keep" -eq 0 ]]; then
      echo "remove live skill $name"
      run rm -rf "$dir"
    fi
  done
fi

echo "== github cursor/* PRs =="
if [[ "$CLOSE_PRS" -eq 1 ]]; then
  if ! command -v gh >/dev/null; then
    echo "gh not found — close cursor/* PRs by hand" >&2
  else
    while IFS=$'\t' read -r num head; do
      [[ -z "${num:-}" ]] && continue
      echo "close PR #$num ($head)"
      run gh pr close "$num" --repo novarz/grafana --comment "Demo reset — re-run 101/201 from a clean slate." || true
      run git push origin --delete "$head" || true
    done < <(gh pr list --repo novarz/grafana --state open --limit 50 --json number,headRefName --jq '.[] | select(.headRefName|startswith("cursor/")) | [.number,.headRefName] | @tsv')
  fi
fi

if [[ "$FORCE_PUSH_MAIN" -eq 1 ]]; then
  echo "== force-push GitHub main to $PIN_REF =="
  run git push --force-with-lease origin main
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
