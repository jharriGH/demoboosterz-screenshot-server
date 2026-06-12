<<<<<<< Updated upstream
# 🧠 DemoBoosterz — CLAUDE.md
# Auto-healed by claude_md_healer.py from Jim Brain state
# Last healed: 2026-05-12 00:00:05 UTC
# Repo: /opt/demoboosterz
=======
## Empire onboarding -- read every session
Single source of truth: jharriGH/kjle. On session start, fetch + follow:
- https://raw.githubusercontent.com/jharriGH/kjle/main/EMPIRE_SC_HANDOFF.md
- https://raw.githubusercontent.com/jharriGH/kjle/main/EMPIRE_INTEGRATION_STANDARD.md
Keep current at this repo root:
1. ROADMAP.md -- valid YAML front-matter (project, status, description, last_updated, repo,
   api_url, facts_doc, vault_key, integrates_with). The empire dashboard reads this; bump
   last_updated on any change.
2. PROJECT_FACTS.md -- integration contract (endpoints, schema, auth), verified against the
   live system. Vault key NAMES only, never secret values.
To learn about another project: brain_search for "<project> integration" or read EMPIRE_INDEX.md
in jharriGH/kjle -> that project's PROJECT_FACTS.md -> brain_vault_search for its key.
Repo edits: this repo only, explicit file paths only.

---
## AUTONOMOUS EXECUTION — READ THIS FIRST

You are part of the King James Empire CC fleet.
Jim Harris is NEVER the middleman. Ever.

BEFORE ANYTHING ELSE:
brain_session_start(focus="[task]", product="[project]")

GET CREDENTIALS (never ask Jim):
brain_vault_search("what you need")

DISPATCH ANOTHER CC (never ask Jim to do it):
run_build_task(project="[project]", prompt="[task]")

LOG EVERYTHING:
brain_log(content, project)     — events
brain_memory(content, tags)     — decisions

END EVERY SESSION:
brain_session_end(product, what_shipped,
  decisions, next_action)
brain_save_card(title, project, content)

ONLY INTERRUPT JIM FOR:
+ Business decisions requiring his judgment
+ Credentials genuinely not in vault after search
+ Task complete — here are the results
+ Truly blocked with specific reason

NEVER:
- Ask Jim for credentials
- Ask Jim to copy/paste anything
- Present options and wait
- Ask Jim to run any command
- Be the middleman between SC and CC

KJE MCP: https://kje-mcp.onrender.com/mcp/T24NM1Sxbh7txJs-unNIjblaXMqA1OZW6gNU-Ud5Yjk/
VPS: 192.161.173.97 (claude at /usr/local/bin/claude)
Brain: https://jim-brain-production.up.railway.app
Key: jim-brain-kje-2026-kingjames
---

---
## MANDATORY: START EVERY SESSION WITH THIS
brain_session_start(
  focus="[describe what you are working on]",
  product="[this repo's project id]"
)
Brain URL: https://jim-brain-production.up.railway.app
Brain Key: jim-brain-kje-2026-kingjames
DO THIS BEFORE ANY OTHER WORK. NO EXCEPTIONS.
---

# CLAUDE.md — King James Empire Master Rules
# Version: 2.0 | Updated: April 1, 2026
# READ THIS ENTIRE FILE BEFORE TOUCHING ANYTHING.
# These rules override Claude's default behavior. No exceptions.
>>>>>>> Stashed changes

---

## WHO YOU WORK FOR

You are working for Jim Harris — King James Empire (KJE).
Empire-wide rules in `/opt/jim-brain/CLAUDE.md` (KJ_RULEZ) apply unless this
file explicitly supersedes them.

Brain endpoint: `https://jim-brain-production.up.railway.app`
Brain key: `jim-brain-kje-2026-kingjames` (header: `x-brain-key`, lowercase)

---

## PROJECT STATUS

- **Project:** DemoBoosterz 🚀
- **ID:** `demoboosterz`
- **Group:** KJE SaaS
- **Status:** `testing`
- **Description:** Demo builder — launch ready, guided tour pending

### Next Action
Stress test all flows and niches. Fix remaining bugs. Close as COMPLETE. Then build sales page.

---

## RECENT MEMORIES (top 1)

1. Saved card IDs: ReviewBombz 1776982890230, KJLE 1776982893503, KJWidgetz 1776982896422, DemoEnginez 1776982899202, DemoBoosterz 1776982901880, SiteEnginez 1776982904787, IASY 1776982907530, UnhideLocal 1776982910247, TestEnginez 1776982912894

---

## BUILD STATE

**Card:** KJE Orchestrator BUILD_STATE 2026-05-11
**Saved:** 2026-05-11T20:14:22.905640

# KJE Orchestrator — BUILD_STATE 2026-05-11

**Status:** LIVE
**URL:** https://kje-orchestrator.onrender.com
**Render Service:** srv-d813bjvavr4c73b223b0
**Repo:** https://github.com/jharriGH/kje-orchestrator
**Build SHA:** cee25b8799de (P3 v1.0.0)
**Plan:** starter ($7/mo)
**Region:** oregon

## Verified endpoints
| Endpoint | Result |
|----------|--------|
| `GET /health` | HTTP 200 `{"status":"ok","version":"1.0.0"}` |
| `GET /version` | HTTP 200 (build, poll_interval, stall_timeout) |
| `GET /status` | HTTP 500 — pending `kjcodedeck.wave_manifest` table creation |
| `POST /trigger-poll` | guarded by `x-trigger-key` header |

## Files shipped (11)
1. `main.py` — FastAPI app, lifespan boots BrainClient + WaveEngine + Poller
2. `poller.py` — APScheduler 60s tick, calls `wave.process_logs(logs)`
3. `wave_engine.py` — wave_manifest reader, complete/blocked/stalled detection, VPS dispatch
4. `notify.py` — retry+backoff wrappers around `/notify`, `/memory`, `/log`
5. `brain_client.py` — httpx async client with lowercase `x-brain-key`
6. `requirements.txt` — fastapi 0.115.5, supabase 2.9.1, apscheduler 3.10.4, etc.
7. `Procfile` — `web: uvicorn main:app --host 0.0.0.0 --port $PORT`
8. `render.yaml` — service blueprint w/ `sync: false` secrets
9. `Dockerfile` — python:3.11-slim, non-root user, healthcheck
10. `.env.example` — every env var documented
11. `README.md` — full runbook + schema + ops guide
   (+ `.python-version` and `runtime.txt` pinning 3.11.10 after Render's default of 3.14 broke first deploy)

## Wave-chaining logic
- Poll Brain `/logs?limit=50` every 60s (configurable).
- Group entries by `tags + job_id`. Match against active wave's `jobs[]`.
- **Complete:** every job logged `task_complete` → mark wave `done`, chain next queued.
- **Blocked:** any job tagged `blocker`/`fatal`/`halt` → mark wave `blocked`, SMS + memory.
- **Stalled:** >30 min without job-tagged log entries → mark `stalled`, SMS.
- **Chain:** lowest-priority queued wave promoted to `active`, each job POSTed to VPS_DISPATCH_URL with X-Dispatch-Key.

## Env vars on Render (14)
PYTHON_VERSION=3.11.10, BRAIN_URL, BRAIN_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY,
VPS_DISPATCH_URL=http://192.161.173.97:8091/dispatch, VPS_DISPATCH_KEY (64-char),
TRIGGER_KEY (auto-generated, stored on VPS at /tmp/p3_orch_trigger.env),
POLL_INTERVAL=60, POLL_LOG_LIMIT=50, STALL_TIMEOUT=1800, DISPATCH_TIMEOUT=20,
PROJECT_SLUG=kje_orchestrator, LOG_LEVEL=INFO.

## Gotchas captured
- **Render Python default:** first deploy used Python 3.14.3 (latest) and crashed — must pin via `.python-version` + `PYTHON_VERSION` env var + `runtime.txt`.
- **Render envVars via POST /v1/services:** the envVars array inside serviceDetails was silently dropped on create. Fix: `PUT /v1/services/{id}/env-vars` separately, then trigger redeploy.
- **Brain has no POST /projects:** new projects must be registered through the Brain UI; API exposes only GET/PATCH. `PATCH /projects` for kje_orchestrator currently 404s until Jim adds it.
- **/status 500:** `kjcodedeck.wave_manifest` table does not yet exist in Supabase. Create it before promoting orchestrator to active duty (DDL in README.md).

## Decisions
- Starter plan, oregon, autoDeploy=yes — same shape as kjle/jim-brain.
- 30-min stall timeout (configurable via env).
- Trigger key generated via `secrets.token_urlsafe(40)`, not stored in repo.
- Force-push to main per spec; competing P3v3 build script also pushed (commit 71aff4b7) — currently running container is still `cee25b87` build until a later redeploy promotes the newer commit.

## Next actions
1. Register `kje_orchestrator` project in Brain UI so PATCH /projects works.
2. Run DDL to create `kjcodedeck.wave_manifest` table.
3. Insert first test wave (one harmless job) and watch `/status` cycle through queued → active → done.
4. Tune `STALL_TIMEOUT` after observing first 24h of throughput.

---

## EMPIRE-WIDE RULES (excerpt)

1. **Brain Endpoint Verification** — always hit `/health` then the real
   endpoint with `x-brain-key` header BEFORE coding against it. Document
   actual response shape. No assumptions from convention.

2. **Empire Cost Logging** — any LLM call must be instrumented via
   `kje-cost-logger` per `docs/EMPIRE_COST_LOGGING_BUILD_CARD.md`.

3. **Env Var Automation** — CC never asks Jim to manually click env vars
   into a dashboard. Use Render / Railway / Cloudflare APIs. Tokens live
   in CC env (`RENDER_API_KEY`, `RAILWAY_TOKEN`, `CF_API_TOKEN`).

4. **Gotcha Logging** — log any bug / workaround to Brain via
   `POST /memory` with tags `["demoboosterz", "gotcha", "lesson"]` the
   moment context is fresh.

5. **Session Start / End** — every CC session begins with
   `brain_session_start(focus="...", product="demoboosterz")` and ends
   with `brain_session_end(...)` + `brain_save_card(...)`.

---

## VAULT KEYS AVAILABLE FOR THIS PROJECT

Use `GET /vault/demoboosterz/<KEY>/reveal` with header
`x-brain-key: jim-brain-kje-2026-kingjames` to fetch real values.

| Key | Masked | Service |
|---|---|---|
| `NODE_ENV` | `` | render |
| `AUTH_TOKEN` | `` | render |
| `BRIDGEDECK_URL` | `` | render |
| `BRIDGEDECK_INGEST_KEY` | `` | render |

Empire-wide shared keys (always available):

- `GITHUB_PAT_VPS` — VPS automation PAT (contents:write)
- `SUPABASE-PAT-SHARED` — Supabase DDL automation token
- `SUPABASE_PERSONAL_ACCESS_TOKEN` — Supabase PAT (44+ chars)

---

## SESSION END PROTOCOL

Before closing the chat, run:

```
POST /memory   tags=["demoboosterz", "session_end"]
               content="<what shipped, what's next>"
POST /log      tags=["demoboosterz", "session_complete"]
               content="<one-liner>"
POST /cards    title="<Project> BUILD_STATE <date>"
               project="demoboosterz"
               content="<full markdown spec>"
```

If anything broke, log a gotcha memory FIRST so the next session inherits
the lesson.

---

*Synced from Brain state at 2026-05-12 00:00:05 UTC.*
*This file is auto-regenerated every 4h. Manual edits will be overwritten
on the next heal if the rebuilt content differs by >20% of lines.*
