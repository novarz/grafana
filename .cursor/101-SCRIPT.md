# Script Cursor 101 + 201 (Grafana)

**Único talk track.** Tracker = **Jira SDFD**. Automation y Security van aquí. No uses los planes de Cursor ni Linear.

**Otro agente, demo completa — pega esto:**

```
You are on novarz/grafana, branch main (has .cursor/101-SCRIPT.md). Follow that file. First run skill reset-demo (bash .cursor/reset-demo.sh then Jira MCP: only SDFD-1 and SDFD-2 assigned, all To Do, never In Progress). Then run 101, then 201. Do not implement SDFD-1 on main before the room — work on a demo branch. Do not start Grafana in an agent tab. Prompts in English, talk track Spanish. Tracker = Jira SDFD only.
```

Dos sesiones, mismo repo (`novarz/grafana`). No mezclar beats.

Los prompts entre ``` se pegan tal cual (inglés). El resto se dice en castellano.

| | 101 (~20–25 min) | 201 (~20–25 min) |
| --- | --- | --- |
| Qué | Ticket → plan → tests → UI, sin salir del editor | Jira webhook → PR → Bugbot + Security |
| Live | [SDFD-1](https://fe-anysphere-demo.atlassian.net/browse/SDFD-1) pill Light/Dark (Figma Alfonso) | Tú pasas [SDFD-28](https://fe-anysphere-demo.atlassian.net/browse/SDFD-28) a **En curso** |
| Cloud | [SDFD-2](https://fe-anysphere-demo.atlassian.net/browse/SDFD-2) Explore MA, **a mano**. No esperes el PR | El webhook implementa SDFD-28. Playwright headless = PNG. No computer-use |
| No | Bugbot, Security, webhook, En curso en SDFD-1 | Montar el pill en vivo, `/create-rule` |

---

# Lessons (ensayo 2026-09-25) — léelo antes de tocar nada

El 101 **funciona**. Pill entre Search y `+`, tests verdes, Light ↔ Dark. Ensayo ~5 min de implementación; sala **18–22 min** si Grafana está caliente y Jira limpio. No implementes SDFD-1 en `main` antes de la sala. Reset después de cualquier ensayo.

1. **Jira sucio mata el beat 1.** `what's assigned to me in Jira?` tiene que devolver **solo SDFD-1 y SDFD-2**. SDFD-3…28 sin asignar. SDFD-28 en Tareas por hacer, no En curso.
2. **Nada a En curso en el 101.** El webhook no distingue sesiones. Transiciones Jira via API: nombres **To Do / In Progress / Done**, no “Tareas por hacer”.
3. **No arranques Grafana en un tab de agente.** Los watchers mueren y el badge sigue en running. Tú, terminal de **login**: `yarn start` hasta “compiled successfully”, **después** `./bin/grafana server` o `make run`. Comprueba `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/login` → 200. Al revés: “failed to load application files”.
4. **Node:** nvm **24.11.0** está instalado (`~/.nvm`, default). Terminal de login: `node -v` → v24.11.0. Un tab de agente no-login puede seguir viendo el Node 24.18 de Cursor o el v26 de cursor-agent — no arranques webpack ahí.
5. **Jest frío = 3–5 min.** Antes de sala: `yarn jest --watchAll=false` a un `*.test.tsx` cualquiera. En caliente ThemeToggle fue 4 s.
6. **No hay iconos sun/moon** en Grafana. El pill es `RadioButtonGroup` Light/Dark (`adjust-circle` / `circle`). El prompt del plan **tiene que citar SDFD-1 / Figma** o Composer pone el icono de paleta al lado del avatar.
7. **Paracaídas:** `demo/sdfd-1-backup` (no `fed-260`). No la abras hasta cortar el live.
8. **No lances SDFD-2 de verdad en un ensayo.** El Cloud Agent abre PR y quema el beat.

## Cloud (SDFD-2 a mano + webhook 201)

Repo = `novarz/grafana`. Todo `.cursor/` se commitea. Cloud Agent lo ve. El reset borra las rules del 101.

Checklist dashboard (novarz/grafana), no código:

- Automation 201: el prompt de este archivo (Playwright headless, **no computer-use**, Node de `.nvmrc`, nunca `make run`, no subscribe a PR/CI).
- Bugbot on.
- Security Reviewer on (PR opened + pushed). Custom instructions = las de Grafana de este archivo, no las de SDFD-28.
- Cloud Agent usa Node **22** por defecto. `.nvmrc` es **24**. Webpack con 22 + “failed to load application files” es el fallo clásico. El prompt ya lo dice; no lo quites.
- SDFD-2 (101) no arranca Grafana: solo rama + tests + PR. No le pidas screenshots.

---

# 101

## Antes

- Grafana caliente **en tu terminal de login**, no en un tab de agente. `yarn start` hasta compiled, luego backend. http://localhost:3000/ `admin`/`admin`. `curl` → 200.
- Precalienta Jest una vez.
- `main` limpio. Sin diffs. Sin `.cursor/rules/` (el bloque 2 las crea en vivo).
- Paracaídas: `demo/sdfd-1-backup`. No la abras hasta cortar el live.
- Jira: solo **SDFD-1 y SDFD-2** asignadas a ti. SDFD-3…28 sin asignar.
- **Ninguna** story en En curso. El webhook `Tareas por hacer → En curso` (iniciador = tú) implementaría SDFD-1 y te quema el live.
- No abras la pestaña de review.

## Guion (5 bloques)

### 1. Jira (~1 min)

Prompt: `what's assigned to me in Jira?`

Elige SDFD-1 en voz alta. SDFD-2 es Cloud Agent después. **No** las pases a En curso.

### 2. Regla + skill, en vivo (~2 min)

**Regla:** política del proyecto, always-on.

**Skill:** receta. El agente la usa cuando toca, o con `/nombre`.

**Una línea:** la regla dice *qué hay que cumplir*; el skill dice *cómo*.

DI las tres frases. Pega, en este orden:

```
/create-rule Always apply. Every new feature must include tests. Follow contribute/style-guides/testing.md. Create and run the tests before finishing. Report pass or fail. Do not skip tests.
```

```
/create-skill Project skill. When we add a React component, also add a test file next to it (Name.test.tsx). Use React Testing Library. Assert what the user sees or clicks — not that it "rendered". Run yarn jest --watchAll=false on that file and report pass or fail.
```

No autorices extra. No abras el skill largo de Grafana.

| Ámbito | Regla | Skill |
| --- | --- | --- |
| Este repo | `.cursor/rules/` | `.cursor/skills/` |
| Tu usuario | User Rules | `~/.cursor/skills/` |
| Equipo | Team Rules | Marketplace |

### 3. Plan (~4 min)

Modo Plan, razonamiento alto:

```
Create a plan to implement SDFD-1. Add a Light/Dark pill in the top header between the search control and the + action, matching the Figma on the ticket. Call toggleTheme / changeTheme from app/core/services/theme. Do not refactor ThemeSelectorDrawer, command palette, or keybindings. Reuse existing t() keys. Include colocated unit tests. Do not run i18n-extract.
```

Composer: construye el plan. Tests: la rule los exige; el skill dice cómo. No es un bloque aparte.

### 4. UI + Cloud Agent

Recarga localhost:3000. Light ↔ Dark.

**Mientras** Composer implementa, lanza Cloud Agent en SDFD-2 **desde Cursor**, no desde Jira. No te sientes a esperarlo.

```
Implement SDFD-2 on a new branch. Moving-average overlay in Explore Graph, toggle to the right of Lines/Bars/Points. Off = primary series only. On = dashed MA line alongside. Follow contribute/style-guides/testing.md and frontend-testing-strategy (in .cursor/skills). Use the Node version in .nvmrc for yarn/jest. Do not start webpack, make run, or grafana-server. Do not wait for review — open a PR when tests pass.
```

Si Composer se alarga en SDFD-1: `git checkout demo/sdfd-1-backup`. “Esto ya está en una rama; lo dejo montado y seguimos.”

### 5. Cierre (~1 min)

Ticket → planificado, implementado, testeado, sin salir del editor. Regla, skill y Cloud Agent ya salieron.

**Hoy no:** webhook, Bugbot, Security. Eso es el 201.

---

# 201

Mismo Grafana en :3000. `main` otra vez limpio (el pill del 101 no está mergeado).

## Antes

- Security Reviewer **on** en `novarz/grafana` (trigger PR opened + pushed). Custom instructions = las de Grafana (sanitize / sinks), no las de SDFD-28.
- Bugbot **on**.
- Dependabot off / PRs de deps cerradas. Solo debe aparecer el PR del webhook.
- Jira: **SDFD-28** asignada, estado **Tareas por hacer**. SDFD-1/2 no las toques (o ya hechas, sin En curso).
- Prompt de la automation actualizado: Playwright headless, Node de `.nvmrc`, no computer-use.

## Guion

### 1. El disparador (~2 min)

Enseña la automation de Jira: transición **Tareas por hacer → En curso**, iniciador tú, POST al webhook de Cursor.

El payload lleva `issueKey`, `summary`, `description`, `url`.

### 2. Lo lanzas (~1 min)

Abre SDFD-28. **Tú** la pasas a En curso. (Si la transiciona otro, el `If iniciador` no dispara.)

### 3. Qué está haciendo (~3 min)

Cloud Agent en `novarz/grafana` / `main`. Banner HTML, tests colocados, PNG con **un** script Playwright (login `admin`/`admin`, skip password). Si la página no carga: para y reporta. No Grafana restart, no incognito, no Browser subagent.

Jest = comportamiento (dismiss, XSS). Playwright = dos fotos.

### 4. El PR (~8 min)

Cuando abra el PR: Bugbot comenta (calidad / sticky / tests / a11y). Security Reviewer comenta vulns **de este diff**, o un top-level “no findings” si el agente sanitizó con `textUtil.sanitize`.

No pidas “keep CI green” en el prompt (eso suscribe al implementer y tapa los comments).

### 5. Cierre (~2 min)

101 = tú en el IDE. 201 = Jira mueve estado, Cursor implementa, Bugbot y Security revisan el PR. Tres agentes distintos; las suscripciones solo despiertan al del webhook.

---

# Reset

Lo reutilizable es **reset + prompts**, no el merge.

Otro agente / antes de repetir 101+201:

```bash
bash .cursor/reset-demo.sh
```

Luego Jira (skill `reset-demo`): solo SDFD-1 y SDFD-2 asignadas, todas To Do, SDFD-28 sin asignar. El script no toca Jira.

## Después del 101 / antes de repetirlo

1. `git checkout main`. Working tree limpio. Nada de ThemeToggle. Borra `.cursor/rules/` y el skill del bloque 2. Deja este archivo y `frontend-testing-strategy` / `panel-testing-strategy`.
2. Jira: SDFD-1 y SDFD-2 asignadas, **Tareas por hacer**. SDFD-3+ sin asignar. Cierra PRs de SDFD-2 si el Cloud Agent abrió uno.
3. Webpack caliente. `admin`/`admin`.

## Después del 201 / antes de repetirlo

1. Cierra el PR de SDFD-28 y borra la rama `cursor/…`.
2. SDFD-28 → **Tareas por hacer** (no En curso: eso dispara otra vez).
3. `main` limpio. Security sigue on.

Si el Cloud Agent sanitiza, Security puede salir limpio. El beat sigue siendo “ha corrido y ha dicho algo”. XSS de teatro = un diff **sin** `textUtil.sanitize`; el AC de SDFD-28 pide sanitize, así que un agente bueno estará limpio. No lo fuerces en el prompt.

## Prompt de la automation (201)

Trigger: webhook Jira. Tools: repo + Slack (canal en el editor). Model: fíjalo (no Auto) si quieres predecible.

```
A Jira automation webhook fired. The HTTP body is JSON with:
issueId, issueKey, url, projectKey, projectName, summary, description, issueType, priority, status, statusFrom, statusTo, assignee, initiator.

This webhook is already filtered in Jira (SDFD, Tareas por hacer → En curso, initiator Sergio). Still no-op if projectKey is not SDFD, or status / statusTo is not "En curso", or issueKey is missing.

Do not call Jira to re-fetch the issue unless a field is empty. Use summary + description as the spec.

Then triage, implement on novarz/grafana, and open a PR. Base branch is main. Never use make run.

1. Comment a short triage on the Jira issue. Then implement on a new branch from main. Follow existing Grafana frontend patterns. Colocate tests.

2. If this is a UI/UX change, take before/after screenshots only.
   Node: use the version in .nvmrc before any yarn command. Do not start webpack with Node 22 if .nvmrc is 24.
   Backend once, no debug: if bin/grafana is missing, `make GO_BUILD_DEV=0 build-go`. Start grafana-server (SQLite, :3000). Never make run.
   Frontend: `yarn start:noTsCheck`. Wait until webpack has compiled successfully.
   Screenshots: one headless Playwright script (not yarn e2e:playwright). Log in at http://localhost:3000 with admin/admin; if asked to change password, skip. Capture BEFORE, implement, capture AFTER. Save docs/demo-screenshots/<issueKey>-before.png and -after.png. Commit them. Post both to Slack with url and the PR URL.
   Do not launch a computer-use agent, Browser subagent, or interactive desktop.
   If the page fails to load (including "failed to load application files"), stop and report it. Do not restart Grafana, hard-reload, clear cookies, or open incognito.
   Do not re-check dismiss, navigation, or XSS in the browser. Behavior is `yarn jest --watchAll=false` on the colocated tests only.
   If the issue is not UI/UX, skip the server, Playwright, and Slack.

3. Run colocated tests with `yarn jest --watchAll=false`. Do not run Playwright e2e. Do not wait for review. Do not subscribe to PR comments, reviews, or CI. Do not merge.

4. Open a PR into main. PR body: what changed, test commands, Jira url, screenshot links when they exist.

If blocked, comment on the Jira issue and stop.
```

## Security Reviewer (custom instructions, todo el repo)

```
You are reviewing PRs on novarz/grafana. Only report issues introduced or made exploitable by THIS diff. Do not audit the rest of Grafana.

Grafana XSS / injection boundary: textUtil.sanitize or textUtil.sanitizeXSS before any HTML sink; textUtil.sanitizeUrl for hrefs. Flag when request, dashboard, plugin, or operator input reaches a sink without that boundary.

In-scope sinks:
- dangerouslySetInnerHTML, innerHTML, document.write, insertAdjacentHTML
- new Function() / eval on user-controlled input
- Unsanitized URL/query/search params rendered into the DOM
- Markdown/HTML from dashboards, plugins, or annotations rendered as HTML

Out of scope unless this diff touches them:
- Global disable_sanitize_html
- Pre-existing Grafana XSS
- Style, missing tests, a11y (Bugbot owns those)

Each finding: severity, source → sink, why existing sanitize/auth does not block it, concrete fix. No theoretical issues. If none are medium/high/critical, one top-level comment: no exploitable findings in this diff — no inline comments.
```

## Contrapartidas

- SDFD-1 pide pill Figma (entre search y +), no un icono de paleta. El prompt del plan tiene que citar el ticket.
- El webhook no distingue 101 de 201: **cualquier** En curso con tu usuario implementa. Por eso SDFD-1 no se toca en el 101.
- Track `.cursor/` entero. El reset borra las rules del 101. Bugbot se customiza en el dashboard.
- Dependabot vive en el `dependabot.yml` de Grafana. Si reaparece, cierra esas PRs; no las enseñes.
