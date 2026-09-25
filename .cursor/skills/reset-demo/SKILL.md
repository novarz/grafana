---
name: reset-demo
description: Reset the Grafana Cursor 101+201 demo (Jira SDFD, git, cursor/* PRs) to a clean starting state. Use when the user says reset the demo, prepare another agent to run 101/201, clean SDFD assignments, or start the demo from scratch.
---

# Reset demo (101 + 201)

Do this **before** another agent runs the full demo. Talk track: `.cursor/101-SCRIPT.md`.

Do **not** implement SDFD-1/2/28. Do **not** start Grafana in an agent terminal. Do **not** transition anything to In Progress / En curso.

## 1. Git + GitHub

From the repo root:

```bash
bash .cursor/reset-demo.sh
```

`--dry-run` to print. `--no-close-prs` if you must keep an open `cursor/*` PR.

The script:

- pins local `main` to **`origin/demo/start`** (frozen clean demo). Not `origin/main` — that is wrong after an accidental SDFD merge.
- `--force-push-main` also resets GitHub `main` to that pin
- `--to-main` pins to `origin/main` after you have moved `demo/start`
- `git clean` untracked pill/banner/MA files under AppChrome and Explore Graph
- deletes live `/create-rule` files and any skill that is not `add-e2e-selectors`, `frontend-testing-strategy`, `panel-testing-strategy`, `reset-demo`
- closes leftover `cursor/*` PRs on **novarz/grafana**
- leaves `demo/sdfd-1-backup` alone (that is the live parachute, not the clean start)

After kit-only merges to main, slide the pin: `git push origin origin/main:demo/start`

Does not touch Jira.

## 2. Jira (MCP, required)

Site: `https://fe-anysphere-demo.atlassian.net` (call `getAccessibleAtlassianResources` once, reuse `cloudId`).

Workflow transition names are English: **To Do**, **In Progress**, **Done**. UI may say Tareas por hacer / En curso.

1. `searchJiraIssuesUsingJql`: `assignee = currentUser() AND project = SDFD`.
2. Unassign every SDFD key except **SDFD-1** and **SDFD-2** (`editJiraIssue` `assignee: null`).
3. Assign SDFD-1 and SDFD-2 to the current user if needed.
4. Transition SDFD-1, SDFD-2, and **SDFD-28** to **To Do** if they are not already. Never use In Progress — that fires the webhook.
5. Confirm: assigned to me = only SDFD-1 and SDFD-2, both To Do. SDFD-28 unassigned, To Do.

## 3. Report

- git: on `main`, no ThemeToggle / notice banner / live rules / extra skills
- PRs: which `cursor/*` PRs you closed
- Jira: keys assigned + statuses
- Grafana: `curl` login status (200 or tell the human to start it)

Then stop. The next agent reads `.cursor/101-SCRIPT.md` and runs 101, then 201.
