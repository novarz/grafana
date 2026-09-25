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

The script restores header/demo files, deletes live `/create-rule` rules, deletes `colocated-react-tests`, and closes leftover `cursor/*` PRs on **novarz/grafana**. Dependabot is disabled on this repo.

Canonical branch is **main**. The kit (this skill, `.cursor/101-SCRIPT.md`, testing skills) lives there.

## 2. Jira (MCP, required)

Site: `https://fe-anysphere-demo.atlassian.net` (call `getAccessibleAtlassianResources` once, reuse `cloudId`).

Workflow transition names are English: **To Do**, **In Progress**, **Done**. UI may say Tareas por hacer / En curso.

1. `searchJiraIssuesUsingJql`: `assignee = currentUser() AND project = SDFD`.
2. Unassign every SDFD key except **SDFD-1** and **SDFD-2** (`editJiraIssue` `assignee: null`).
3. Assign SDFD-1 and SDFD-2 to the current user if needed.
4. Transition SDFD-1, SDFD-2, and **SDFD-28** to **To Do** if they are not already. Never use In Progress — that fires the webhook.
5. Confirm: assigned to me = only SDFD-1 and SDFD-2, both To Do. SDFD-28 unassigned, To Do.

## 3. Report

- git: clean of ThemeToggle / notice banner / live rules
- PRs: which `cursor/*` PRs you closed
- Jira: keys assigned + statuses
- Grafana: `curl` login status (200 or tell the human to start it)

Then stop. The next agent reads `.cursor/101-SCRIPT.md` and runs 101, then 201.
