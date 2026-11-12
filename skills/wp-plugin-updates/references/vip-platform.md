# WordPress VIP: platform checks through the VIP MCP

Optional. Used only when the project is hosted on WordPress VIP **and** the VIP MCP (WordPress VIP's *Secure MCP*, toolset *VIP MCP*) is connected in this session. Without it, every step below falls back to the normal workflow and nothing is blocked. Never ask the developer to install or connect it during a run; mention it once in Setup.

What it adds: proof that the deploy landed (commit SHA), the real plugin versions on staging and production, and the server's health before and after each deploy (PHP errors, slow queries, response time, 5xx). It never deploys, never rolls back, never changes settings.

## Detection (Setup)

1. **VIP project:** the repository has `vip-config/` or `client-mu-plugins/` at its root (VIP's codebase layout). Record `vip.detected: true` in `plugin-updates/test-config.json`.
2. **MCP connected:** the session has tools whose names end in `app_list` and `environment_get_deployments` (the prefix depends on how the server was added, for example `mcp__vip-platform__`). If not, say in one line: `VIP project. VIP MCP not connected: platform checks will be skipped (see the README to enable them).` and set `vip.mcp: false`. Do not ask anything.
3. **Map the app:** `app_list`, then pick the app whose `repo` matches `git remote get-url origin` (ignore `.git` and protocol). If none or several match, ask one question with the candidates. `app_list_environments` gives the environments: save `vip.appId`, `vip.environments.production` and `vip.environments.staging` (the non-production environment that matches the staging URL, usually `preprod`, `staging` or `develop`). IDs are not secrets.
4. **URLs:** if the staging or production URL is not set yet, suggest the primary domain from `environment_get_domains` as the recommended option of the Setup question instead of asking blank.

## Allowed tools

Only these. Anything else from the VIP MCP is **forbidden** in this workflow, even if the tool is visible.

| Tool | Use | Type |
|---|---|---|
| `user_get_me`, `app_list`, `app_get`, `app_list_environments`, `environment_get_domains` | Setup mapping | read |
| `environment_get_deployments` | Confirm a deploy finished and which commit it shipped | read |
| `environment_get_logs` | PHP/app errors before and after a deploy | read |
| `environment_get_slowlogs` | Slow MySQL queries before and after | read |
| `environment_get_metrics` | Response time P50/P95, HTTP 5xx, PHP/CPU/memory, cache hit rate | read |
| `environment_get_software_settings` | PHP and WordPress version, for the report | read |
| `environment_list_audit_events` | Context when something changed outside the workflow | read |
| `environment_run_wpcli` | **Only** the read-only commands listed below | read-only commands |
| `environment_database_backup_start`, `environment_database_backup_get_progress` | Optional restore point before the **production** deploy, only after the developer says yes in this run | write (opt-in) |
| `environment_purge_cache` | Purge the tested URLs after a deploy, only after the developer says yes in this run | write (opt-in) |

**Read-only WP-CLI** (`environment_run_wpcli`, the command string without the leading `wp`): `plugin list --format=json --fields=name,status,version`, `plugin get <slug> --field=version`, `core version`, `option get siteurl`, `option get home`. Nothing else: no `plugin update/activate/deactivate/install`, no `cache flush`, no `db`, no `eval`, no `search-replace`, no `cron event run`.

**Forbidden, always:** deploys (`environment_deploy_*`), `environment_rollback`, `environment_sync`, `environment_sql_import_*`, media import/export, environment variables, security settings (Basic Auth, IP and user-agent restrictions, Defensive Mode), domains, software version updates, `environment_create_child`, `environment_retire`, organization users, phpMyAdmin, backup download URLs, and the generic `execute` GraphQL tool. If a fix needs one of these, tell the developer what to do in the VIP Dashboard; never do it.

**Step-up verification:** if a call returns a verification link (`verificationUrl`), show it to the developer, wait until they say it is done, and continue once. Never open or complete it yourself. A read-only call should not need it; if one does, stop and say so.

## Recipes

### Baseline (before each deploy)

Run together with the Playwright *before* snapshot (see `SKILL.md`), right before asking the developer to deploy. For the target environment:

1. `environment_get_deployments`: record the current deployment (id, commit SHA, finished time) as `baseline.deploymentId` / `baseline.commit`.
2. `environment_get_logs` (type `app`, the most recent page): record the distinct error **signatures** (message without timestamps, request ids or numbers), with a count. Only PHP fatals, errors and warnings; ignore notices and deprecations unless they mention an updated plugin.
3. `environment_get_slowlogs` (most recent page): record the distinct normalized queries (numbers and strings replaced by `?`) and their count.
4. Record `baseline.takenAt`. Metrics need no capture: they are read later for the window before the deploy.

Save it in `state.json` under `<environment>.vip.baseline`. Keep it short: signatures and counts, never full log lines.

### Verify deployment (after the developer says the deploy is complete)

1. `environment_get_deployments`: the newest deployment must be finished and successful, newer than `baseline.deploymentId`, and its commit must contain the updates commit (equal to it, or the merge commit whose parent is it; `git branch -r --contains` / `git log` locally help). Poll a few times (30 s apart, at most 10 minutes) while it is running.
2. Failed deploy: report it with the reason and stop (`BLOCKED`); never retry it. Wrong commit: tell the developer which commit is live and ask how to continue.
3. `environment_run_wpcli` `plugin list --format=json --fields=name,status,version`: every updated plugin must be at `installedVersion` with the same active status as locally. This replaces the public `?ver=` guess. A mismatch is **Failed** (the deploy did not ship what was tested).

### Health after the deploy

Wait at least 10 minutes after the deploy finished (run the Playwright tests meanwhile, they also produce traffic), then:

1. **Logs:** `environment_get_logs` since the deploy. Signatures not in the baseline are **new**. A new fatal or error that mentions an updated plugin's path or slug = **Failed**; any other new fatal/error = **Warning** (may be unrelated, quote it); signatures already in the baseline = **pre-existing**.
2. **Slow queries:** new normalized queries that appear 3+ times, or that mention an updated plugin's tables/options = **Warning**; the rest pre-existing.
3. **Metrics:** `environment_get_metrics` for the same length of time before and after the deploy (at least 30 minutes before; after = since the deploy). P95 origin response time up more than 30% or origin 5xx rate up more than 1 percentage point = **Warning**; doubled P95 or 5xx above 5% = **Failed**. Little traffic (staging) makes metrics noisy: report them as information unless the change is extreme, and say so.
4. Production only: after the developer says yes, purge the tested URLs (`environment_purge_cache`) **before** the Playwright *after* snapshot so it does not compare a cached page.

Report everything in the *VIP Platform Health* section of the report: one row per check with before, after and result.

### Optional production restore point

At the end of staging validation, before asking for the production deploy, ask **one** question: *Create a database restore point on production first (Recommended)* / *Skip*. On yes: `environment_database_backup_start` for production, poll `environment_database_backup_get_progress` until done, record the time in the report. It is a checkpoint, not a downloadable dump. Never start restores; restoring is done by the developer or VIP Support.

## Never

Rollback, deploy, merge or change anything on the platform. If production looks broken after the deploy, say it clearly, show the evidence and the previous deployment id from the baseline, and let the developer decide (rollback in the VIP Dashboard or a revert commit).
