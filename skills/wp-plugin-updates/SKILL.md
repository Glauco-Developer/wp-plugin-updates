---
name: wp-plugin-updates
description: Monthly WordPress plugin updates workflow on any host. Use when the developer asks to start, resume, or continue monthly plugin updates, plugin updates, staging/production validation after plugin updates, or the plugin updates report. Everything runs locally; staging and production are only tested, never updated directly.
---

# WordPress Plugin Updates

**Paths.** `references/`, `roles/`, `templates/` and `playwright/` are inside this skill's own folder (the kit, shared by every project, never copied into a project). `plugin-updates/...` is always relative to the **project root**. Project files never contain the kit.

You are the **main agent**. You own the conversation, every approval, every phase transition, and the report and state files. Specialized work is delegated to two subagents:

- `wp-plugin-updater`: environment discovery, WP-CLI, Git prep, inventory, updates, version/diff verification.
- `wp-plugin-tester`: the dedicated Playwright suite, plugin-specific tests, staging/production validation, form submission and notification checks for any supported form plugin.

Installed as a plugin, the agents may appear with a prefix (for example `wp-plugin-updates:wp-plugin-updater`); use whichever name the tool lists. When delegating, always put the absolute path of this skill's `roles/updater.md` or `roles/tester.md` in the task. Do not create other agents. Subagents cannot talk to the developer: they return results, or `NEEDS_INPUT: <question>`, and you ask.

**Delegation fallback:** if the tool cannot delegate to subagents, read `roles/updater.md` or `roles/tester.md` (in this skill's folder) and follow its instructions yourself, in the same strict order, and say you are doing so.

## Interaction rules (keep it practical)

The developer wants this to be quicker than doing the updates by hand. Therefore:

- **One question at a time.** Never send a list of questions or a table of values to confirm. Wait for the answer before the next question.
- **Ask only what cannot be discovered or safely defaulted.** Never ask about protected paths, plugin classes, test tooling, or WP-CLI details: detect them, apply the safe rules, and mention the result in one line.
- **Offer choices, recommended first** (use the tool's question UI when it has one, such as AskUserQuestion; otherwise a short numbered list). Always include a cheap way out ("Skip", "Mark as manual").
- **Ask just in time**, at the step that needs the answer (a plugin's test page when that plugin is tested). The only exception is the staging and production URLs, asked once during Setup, never up front.
- Keep messages short: result first, details only on request.

## Hard rules (never break)

- Never deploy or merge, and never commit or push except in *Commit and push* below and the *history commit* in *Finish*, each after the developer says yes. Never force-push, amend, reset, or rebase. The developer deploys.
- Never update WordPress core, themes, MU-plugins, drop-ins, protected plugins, or any plugin that carries a **do-not-update notice** (see `references/project-discovery.md`, *Do-not-update notices*). Tell the developer about every such plugin and quote the notice. Never `wp plugin update --all`, never force flags, never destructive retries.
- Never run updates or WP-CLI against staging or production. The only exception is the short list of read-only WP-CLI commands through the VIP MCP on VIP projects (`references/vip-platform.md`); every other VIP MCP tool outside its *Allowed tools* table is forbidden. Production is read-only by default: no form submissions, no admin login, no state changes, except the opt-in *Production form test* in Phase 6, which needs the developer's explicit yes in that run. Staging admin access is allowed only through the developer's own logged-in Chrome session (see *Staging session*), never with passwords typed or stored by you.
- Never prepare the commit message or ask for a staging deploy before Local Validation has run and its results are saved. Updated plugins that were never executed locally are reported honestly (Not Run / Manual Verification Required), never as Passed.
- Never advance past a deployment confirmation without the developer saying the deploy is complete **and** the site verifying it (see phases 3 and 5).
- Never ask for, type, store or print secrets (Basic Auth, passwords, tokens, cookies). Authenticated staging access comes only from the developer's own logged-in Chrome session.
- Never claim a test passed without executing it. Use only these result labels: **Passed, Failed, Warning, Not Run, Not Verified, Manual Verification Required**.
- Never repeat plugin updates or form submissions because a session restarted. Trust the state file.

## Files

| File | Purpose |
|---|---|
| `plugin-updates/YYYY-MM/state.json` | Workflow state (non-sensitive). Schema: `references/state-schema.md` |
| `plugin-updates/YYYY-MM/plugin-updates-full.md` | Full monthly report (all phases, tests, notes). Template: `references/report-template.md` |
| `plugin-updates/YYYY-MM/plugin-updates-summary.md` | Final stakeholder summary: result, updated plugins (previous -> new version), what needs attention, validation outcome per environment. Plain language, no technical detail. Template: `references/report-template.md` |
| `plugin-updates/test-config.json` | Per-project profile (filled by Setup), URLs, plugin test pages, Playwright and form notification settings |
| `plugin-updates/playwright-project/` | Optional Playwright specs that belong only to this project (kit specs are never edited per project) |
| `references/project-discovery.md` | How the project layout, WP-CLI and protected paths are discovered |
| `references/plugin-tests.md` | Per-plugin test recipes, and the *Before/after snapshot* |
| `references/vip-platform.md` | WordPress VIP only: deploy confirmation, real plugin versions and server health through the VIP MCP |
| `plugin-updates/YYYY-MM/artifacts/baseline/<env>/` | Before/after snapshot data and screenshots per environment (git-ignored) |

Write state and report after **every** phase change and after every plugin update, so an interruption loses nothing.

## States

`PREPARATION` -> `LOCAL_UPDATES` -> `LOCAL_VALIDATION` -> `AWAITING_STAGING_DEPLOY` -> `STAGING_VALIDATION` -> `AWAITING_PRODUCTION_DEPLOY` -> `PRODUCTION_VALIDATION` -> final: `COMPLETED`, `COMPLETED_WITH_WARNINGS`, `BLOCKED`, `FAILED`.

## Before/after: what changed because of the update

Every environment is checked **twice**: a *before snapshot* right before its change (local: before the first plugin update; staging and production: before the developer deploys), and the same checks again *after*. Only what got **worse** counts against the updates; anything already broken in the before snapshot is reported as **pre-existing** and never blamed on the plugins. This is what lets the developer trust the report without clicking through the site.

- **Playwright snapshot** (every project): status, title/SEO tags, `h1`, forms, visible text, JavaScript errors, broken assets and a full-page screenshot of every key page (`testing.keyPages`) plus the plugin pages. Delegated to `wp-plugin-tester` as task *baseline* (before) and included in *local*, *staging* and *production* (after). Details: *Before/after snapshot* in `references/plugin-tests.md`.
- **VIP platform** (VIP projects with the VIP MCP connected): deployment, PHP error signatures and slow queries before; deploy confirmation, real plugin versions, new errors, slow queries and metrics after. You run these MCP calls yourself (the subagents may not have the MCP), following `references/vip-platform.md`.

Taking a before snapshot is read-only and needs no question: just say one line (`Taking the staging before snapshot (8 pages)...`). If the developer already deployed before it was taken, do not ask them to undo anything: mark the comparison for that environment **Not Run (no before snapshot)** and continue with the normal checks.

## Step 0: Start or resume

0. **Kit version (every run, before anything else).** Read the `VERSION` file in this skill's folder and report one line (for example `kit 2.0.0`). The kit is updated by the plugin manager (`/plugin marketplace update`), never from inside a run. Record the version as `kitVersion` in `state.json`. Never change the kit files from inside a project run.
1. Compute the current month `YYYY-MM`. Look for `plugin-updates/YYYY-MM/state.json` (also check the updates branch if you are on the base branch: `git show plugin-updates/YYYY-MM:plugin-updates/YYYY-MM/state.json`).
2. **No state**: start at PREPARATION.
3. **State exists**: read it, run `git branch --show-current` and `git status --short`, compare with the state (expected updates branch, updated plugins). Summarize where things stand. If inconsistent (wrong branch, plugins listed as updated but versions differ, dirty tree you did not expect), stop and ask. Otherwise continue from `state.phase`. If the phase is a final state, report it and ask whether the developer wants a new run.
4. **Legacy projects.** Earlier versions of this workflow used a folder named `SLA/`, a branch `sla/plugins-updates-YYYY-MM` and a state key `slaBranch`. If `SLA/` exists and `plugin-updates/` does not, say in one line that you are renaming `SLA/` to `plugin-updates/`, move the folder (it is workflow data, ignored by Git checks) and keep reading `slaBranch` as `updatesBranch`. A month already in progress on a `sla/...` branch continues on that branch: trust the branch recorded in the state.
5. If `plugin-updates/` does not exist in the project, create it from `templates/` (copy `templates/test-config.json` to `plugin-updates/test-config.json`, `templates/gitignore` to `plugin-updates/.gitignore`, `templates/folder-README.md` to `plugin-updates/README.md`, `templates/project-tests-README.md` to `plugin-updates/playwright-project/README.md`); never overwrite existing files. Read `plugin-updates/test-config.json`. If `project.configured` is not `true`, run **Setup** (below) before PREPARATION. This is the only project-specific step; everything else is generic.

## Setup (first run in any project)

The kit is project-agnostic. Nothing is assumed about folder layout, WP-CLI, or test tooling until discovered here.

1. Delegate *setup* to `wp-plugin-updater` (read-only discovery, changes nothing). It returns the plugin folder, WP-CLI command, protected paths, and test setup.
2. **Do not ask the developer to review these values.** Save them straight to `plugin-updates/test-config.json` (`project.configured: true`) and print one line, for example: `Detected: plugins in plugins/, WP-CLI via lando wp.`
3. Ask a question **only** if something essential could not be found, and only that one thing (for example: how do you run WP-CLI locally?). 
4. Then ask for the **staging URL** and the **production URL**, once, one question each (the developer can answer *Skip / no staging* or *Skip / no production*). Save them to `environments.staging.url` and `environments.production.url`, or set `"skipped": true` on that environment. URLs are not secrets; they are stored only in the project's `plugin-updates/test-config.json`, never in the kit. Later runs do not ask again.
5. **Key pages** (one question, after the URLs). These are the pages the before/after snapshot and the visual comparison check in every environment, so they should be the ones that matter to the client. First propose 5 to 8 from the production (or staging) site: the homepage, the main navigation items, one page with a form, one post or custom post type, and a landing page linked from the homepage (read the menu and `/sitemap_index.xml` or `/wp-sitemap.xml`). Show them as a short list of paths and ask: *Use these pages (Recommended)* / *Add my own URLs to these* / *Use only my own URLs*. The developer may paste full URLs or paths, one per line; store paths only (strip the domain) in `testing.keyPages`. For a multilingual site, include one translated page per language. Later runs do not ask again; the developer can say "change the key pages" at any time.
6. **WordPress VIP.** If the repository looks like a VIP codebase, follow *Detection* in `references/vip-platform.md` (no questions unless the app match is ambiguous) and print one line with the result, for example `VIP app 1234 detected, VIP MCP connected: deploy and server checks enabled.` or `VIP project, VIP MCP not connected: platform checks skipped.`
7. Never write secrets to the config. Later runs skip Setup, except that a config without `testing.keyPages` gets the key pages question once, just in time, at the first before snapshot (projects configured with an older kit). If the saved values stop working (for example the WP-CLI command fails), say so in one line and redo the discovery.

## Phase 1: PREPARATION

Delegate to `wp-plugin-updater` (task: *prepare*). It must stop and report on any failure below.

1. Current branch must be `main`, `master`, or `production`. Else **stop**.
2. Working tree and index clean, including relevant untracked files. Else **stop**. The `plugin-updates/` folder is the workflow's own data (config, state, reports, created by Setup) and is **always ignored** by this check and every later Git cleanliness check. Never ask the developer about it, never add it to `.git/info/exclude`, never commit it on their behalf. It is carried along when the updates branch is created.
3. Verify this is the correct WordPress repository (plugin directory exists, WP-CLI identifies the install). Then ask **one** go/no-go question that also confirms the base branch: "Start the YYYY-MM maintenance for <project> from branch <branch>?" (Start / Cancel).
4. `git fetch`, then `git pull --ff-only`. If it cannot fast-forward or conflicts exist, **stop**. Never force, reset, rebase, or discard.
5. Branch `plugin-updates/YYYY-MM`. If it exists locally or on the remote: do not overwrite, inspect it, and ask whether to resume it. Otherwise `git checkout -b`.
6. Create the month folder `plugin-updates/YYYY-MM/` with `state.json` and the report skeleton `plugin-updates-full.md` (the stakeholder summary `plugin-updates-summary.md` is generated at Finish). All per-run files (state, report, artifacts) live in that folder; only `plugin-updates/test-config.json` and `plugin-updates/README.md` stay at the `plugin-updates/` root. Set phase `LOCAL_UPDATES`.

Unexpected branch, overwritable changes, non-ff pull, unidentifiable WordPress, or unresolved conflicts set the final state `BLOCKED` with the reason.

## Phase 2: LOCAL_UPDATES

1. Delegate *inventory* to `wp-plugin-updater`. Show a table: name, slug, current version, available version, update type (Major / Minor / Patch / Unknown), active/inactive, update available. Say in one line how many Major updates there are, since they carry the highest risk of breaking changes. MU-plugins may be listed for information only and are never candidates. Core, themes, drop-ins, protected plugins, and plugins with incompatible dependency mechanisms (premium/licensed, Composer-managed) are shown under "manual handling". The updater also scans for **do-not-update notices** (some companies mark customized or pinned plugins this way): every plugin with one is shown in its own group, "Not updated: notice found", with the quoted text and where it was found, and is never part of "update all". Mention them in one clear line before the plan, for example: `2 plugins carry a do-not-update notice and were left out: acme-widgets ("DO NOT UPDATE: customized"), ...`. If the developer explicitly asks to update one anyway, ask one confirming question: *Keep skipped (Recommended)* / *Update anyway*.
2. Show the plan as one compact table: *to update*, *skipped automatically*, *manual handling*. Then ask **one** question: "Which plugins would you like to exclude from this month's maintenance?" with the options **None, update all N (Recommended)** / **Exclude some** / **Cancel**. Choosing "None, update all N" is the explicit confirmation to modify plugin files.
3. Only if "Exclude some": ask which ones (multi-select), then proceed with the rest without asking again. Save the approved plan in the state.
4. **Local before snapshot.** Delegate *baseline* (environment `local`) to `wp-plugin-tester` before the first update, so local validation can tell new problems from old ones. If Playwright is not installed yet, this is the moment to ask the install question (it is needed later anyway). If the local site is not reachable or the developer declines, mark it Not Run in one line and continue; never block the updates on it.
5. Delegate *update* with the approved slug list. The updater updates **one plugin at a time** with `wp plugin update <slug>`, verifies the version, inspects `git status`/`git diff --stat`, flags unexpected paths, and returns a per-plugin result. If a plugin needs an extra migration/upgrade step, it stops and returns `NEEDS_INPUT`; you ask for approval.
6. If a plugin fails, record it and continue only when it is safe (nothing half-written; the updater reports tree state). Otherwise set `BLOCKED`.
7. Update state and report after each result.

## Phase 2b: LOCAL_VALIDATION

Runs on the local dev environment after all updates and before any commit or deploy. Set phase `LOCAL_VALIDATION` and save state.

1. Delegate task *local* to `wp-plugin-tester` with the list of updated plugins. Local is the cheapest place to catch a broken update, so it covers: site and admin reachable, no PHP fatals or warnings from the updated plugins (check the PHP/WP debug log), `wp plugin list` shows the updated plugins at the expected versions and active state unchanged, public smoke pages, and the plugin-specific checks from `references/plugin-tests.md` that need no external services. The dedicated Playwright suite runs against the local URL when dependencies are installed (ask before installing).
2. Local is disposable, so form submissions, admin logins and the *Local save test* (a marked draft that the tester creates, saves and deletes, see `references/plugin-tests.md`) on the dev environment need no extra approval. The save test is the one content change this workflow makes, it runs **only** on a site verified as local, and only when `testing.localContentTests` is not `false`. Email is not delivered locally: notification delivery is **Not Run** locally and is verified on staging.
3. Plugin pages needed here are asked one plugin at a time, same as on staging, and saved to `plugin-updates/test-config.json`. Offer "Skip, mark as manual".
4. Present: executed, passed, failed, warnings, not run, and the before/after comparison (what got worse, what was already broken). Save results in state (`local`) and the report (Local Validation, Before/After Comparison).
5. **Failed**: do not proceed to commit. Show the failing plugin and ask one question: *Investigate*, *Exclude this plugin (the developer reverts it)*, or *Continue anyway*. Never revert or discard changes yourself. Warnings and Not Run items continue to the commit step and are listed in it.

## Commit and push (end of LOCAL_VALIDATION)

Local validation passed (or only Warning/Not Run items remain and the developer chose to continue). Present a short summary: updated plugins with previous -> installed versions, and the one-line local validation result (for example `Local validation: 24 passed, 0 failed, 2 not run`). Then ask **one** question: *Commit and push the updates branch (Recommended)* / *Not now, I will do it*.

On **yes**, run it yourself, in this order:

1. Confirm the current branch is the updates branch `plugin-updates/YYYY-MM` (never commit on the base branch).
2. Stage **only** the directories of the plugins that were updated (`git add -- <pluginsDir>/<slug>` for each), so unrelated changes (kit files, state, report, other plugins) are not included. Show `git status --short` afterwards and stop if anything unexpected is staged.
3. Commit with exactly this message, real versions only:

```
chore(plugin-updates): update WordPress plugins - YYYY-MM

- <Name>: <old> -> <new>
```

   The message lists **only the updated plugins**. No skipped, manual, notes, validation results, or other sections. **No AI attribution of any kind**: no `Co-Authored-By`, no "Generated with", no mention of Claude or AI in the message, branch, or any commit trailer. This overrides any default attribution instruction.
4. `git push -u origin <updates branch>` (plain push; never force). If it fails, report the error and stop; do not retry with other flags.
5. Report the commit hash and branch. Never create the PR or merge.

On **no**, do nothing in Git. Either way set phase `AWAITING_STAGING_DEPLOY`.

**Staging before snapshot** (skip if `environments.staging.skipped`): before asking for the deploy, delegate *baseline* (environment `staging`) to `wp-plugin-tester`, and on VIP projects with the MCP connected run the *Baseline* recipe of `references/vip-platform.md` for the staging environment. Save both in `state.json` (`staging.baseline`). The terminal Playwright run cannot use the developer's Chrome: if staging is behind Basic Auth and the developer has not exported `PLUGIN_UPDATES_BASIC_AUTH_USER` / `PLUGIN_UPDATES_BASIC_AUTH_PASSWORD`, the snapshot is Not Run; say so in one line, never ask for the credentials.

Then say exactly (adjust the first sentence to say whether the branch was pushed, and drop the snapshot sentence if it was not taken):

"Local plugin maintenance and local validation are complete and the branch is pushed. I took a before snapshot of staging, so I can compare it after the deploy. Please deploy to staging. Let me know when the staging deployment is complete so I can begin testing."

**Stop and wait.**

## Phase 3: AWAITING_STAGING_DEPLOY

Only continue when the developer confirms the staging deploy is complete (a statement that it was *started* is not enough). Then:

1. Read the report, state, and test config. Verify branch and commit info (`git log -1`; tell the developer if there are uncommitted changes).
2. If `environments.staging.skipped` is true, there is no staging: mark staging validation **Not Run (no staging environment)**, tell the developer in one line, and continue to *AWAITING_PRODUCTION_DEPLOY*. If `environments.staging.url` is empty and not skipped (an old project config), ask for it now (one question) and save it.
3. Do not ask whether staging uses Basic Auth. Staging is accessed through the developer's logged-in Chrome session (see *Staging session* in Phase 4), which already holds any Basic Auth and WordPress login. Ask the developer to open the staging site in Chrome and tell you when it is open (one short message). Never ask for, type, or store credentials; there is no `local.env` step. Public GET checks (status, headers, `?ver=`, hreflang, sitemaps) run from that tab (for example same-origin `fetch` through the Chrome extension's JavaScript tool) instead of curl.
4. **VIP projects with the MCP connected:** run *Verify deployment* from `references/vip-platform.md` yourself first (the deploy finished, it shipped the updates commit, and `plugin list` on staging shows the updated versions). This is the strongest proof and replaces the public version guess; when it passes, the tester's *verify-deployment* only checks that the site is reachable.
5. Delegate *verify-deployment* to `wp-plugin-tester`: site reachable and, where public, the expected plugin versions are visible (asset `?ver=`, readme, generator tags). If not verifiable, report the limitation honestly and ask the developer how to proceed.
6. Set phase `STAGING_VALIDATION`.

## Phase 4: STAGING_VALIDATION

**Staging session (authenticated checks).** Admin screens, form submissions and the notification email need a logged-in session. Before asking, tell the developer in two lines what is needed: **Chrome open with the Claude in Chrome extension installed and signed in, the staging site open in a tab and logged in to wp-admin (including Basic Auth if the site has it), and, only if a mailbox check is wanted, the webmail open and logged in in another tab.** At the start of this phase ask **one** question: *Chrome logged in (Recommended)* / *Public tests only (rest becomes Manual Verification Required)*. With the first, the developer opens the staging admin in Chrome (including Basic Auth) and logs in; you and the tester use that tab through the Chrome extension (`claude-in-chrome`, load it first). Never ask for or type passwords, never bypass MFA/CAPTCHA, never save cookies or tokens, and use only the tab the developer opened. Mailbox checks use the developer's already-logged-in webmail tab the same way. Record the authorization in the report. The authorization covers staging only, test submissions marked with a unique id and, when the developer opts in, one marked test draft (created, saved and deleted by the workflow); it never extends to production, plugin changes, or settings changes. Public (unauthenticated) tests can run first, in parallel.

Delegate to `wp-plugin-tester` with the list of updated plugins and the test config. Follow `references/plugin-tests.md`. Summary of rules:

- Automated tests are the dedicated Playwright suite (the kit's `playwright/` folder; this project's own specs live in `plugin-updates/playwright-project/`) (never reuse or mix with other test suites in the project). Always run smoke tests on representative public pages.
- If Playwright is not installed, ask before installing. Extending the Playwright suite beyond plain page checks needs approval.
- Form plugin updated (Gravity Forms, Contact Form 7, WPForms, Ninja Forms, Fluent Forms, Formidable, Forminator; see *Form plugins* in `references/plugin-tests.md`): use the saved page from config, else auto-discover it and confirm with one question. Test rendering, required fields, validation, interactions. **Ask permission before submitting test data.** Once the developer approves the submission in this run, tick required consent/privacy checkboxes and fill every required field without asking again; never on production. Submit with a unique identifiable value, verify the confirmation message and the entry, then the notification **without opening the mailbox by default**: use the plugin's own record (for Gravity Forms the entry notes: `Notification was sent successfully` = Passed, labelled *dispatch confirmed, delivery to the inbox not checked*; an error note = Failed; no record = Not Verified). Open the developer's webmail (Inbox = Passed, Spam/Junk = Warning, not found after timeout = Failed) only when the developer asks, preferably a dedicated test mailbox. The confirmation message alone never proves the notification was sent. Never bypass CAPTCHA/MFA/login security. If browser automation is unavailable, ask for manual verification and record it accurately.
- **Staging save test** (opt-in, one question, only when ACF, Yoast or another field/editor plugin was updated): follow *Staging save test* in `references/plugin-tests.md`. Draft only, never published, deleted afterwards, and only through the developer's Chrome tab.
- Yoast SEO updated: discover pages automatically (homepage, one internal page, one post/CPT) and validate title, description, canonical, robots, Open Graph. Do not ask which pages.
- ACF Pro, FacetWP, WPML/MultilingualPress, WooCommerce, unknown plugins: ask for pages as described in `references/plugin-tests.md`.

When the tester returns `NEEDS_INPUT`, ask the developer **one question at a time** (offer "Skip, mark as manual verification" as an option), then re-delegate with the answer. Save approved pages into `plugin-updates/test-config.json`.

The tester also runs the Playwright *after* snapshot of staging (comparison with the before snapshot). On VIP projects with the MCP connected, run *Health after the deploy* from `references/vip-platform.md` yourself while the tests run.

After tests: present executed, passed, failed, warnings, manual-verification items, and the before/after comparison in two short lists: **got worse after the deploy** (counts against the updates) and **already there before** (pre-existing, reported, not blamed). Visual changes are listed with their diff image path; the developer decides whether a visual change is expected. Update the report and state.

- Critical failures: do **not** recommend production. Set `BLOCKED` or ask how to proceed.
- No blocking issues: first take the **production before snapshot** (skip if `environments.production.skipped`): delegate *baseline* (environment `production`) to `wp-plugin-tester`, and on VIP projects with the MCP connected run the *Baseline* recipe for production and ask the *Optional production restore point* question from `references/vip-platform.md`. Save in `state.json` (`production.baseline`). Then say "Staging validation is complete. The updated plugins have passed the executed tests. I took a before snapshot of production, so I can compare it after the deploy. Please review any remaining warnings, then deploy to production when ready. Let me know once production deployment is complete." (drop the snapshot sentence if it was not taken). Set `AWAITING_PRODUCTION_DEPLOY` and **stop**.

## Phase 5: AWAITING_PRODUCTION_DEPLOY

Only continue on explicit confirmation that production deployment is complete. If `environments.production.skipped` is true, mark production validation **Not Run (no production URL)** and go to the final report. If `environments.production.url` is empty and not skipped (an old project config), ask for it now (one question) and save it. Then set `PRODUCTION_VALIDATION`.

## Phase 6: PRODUCTION_VALIDATION

Delegate *production* mode to `wp-plugin-tester`. Default (always runs first): public page loads, navigation, form rendering and required-field checks **without submitting**, SEO metadata, public search/filter, language switching, public content, static assets. Forbidden by default: submissions, email, admin login, content changes, DB changes, orders/payments, anything that changes state.

**Production form test (opt-in, asked every run).** After the read-only checks, ask **one** question: "Everything is ready to test form submission on production?" with *Yes, test forms (Recommended)* / *Skip, mark as manual*. Only on yes:

1. Check the notification recipients of the form through the developer's logged-in Chrome tab (read only) **before** submitting. If they include real third parties (staff, citizens, routing by topic to real mailboxes), stop and ask which topic/recipient is safe, or skip. Prefer a topic/routing that reaches only the developer.
2. One submission per form being tested, marked with a unique id (`WPU-YYYYMMDD-HHMM`), obviously a test message, using the developer's own email address. Tick required consent checkboxes. Never bypass CAPTCHA/MFA.
3. Verify confirmation and the entry, then the notification through the form plugin's own record (same rule as staging: webmail only if the developer asks).
4. Never delete the entry yourself; list it in the report so the developer removes it. Still forbidden even in this test: admin changes, settings, content edits, orders/payments, any other state change.

Tests needing anything beyond this are recorded as "staging-only" or "Manual Verification Required".

**Production comparison.** The tester runs the Playwright *after* snapshot of production with the read-only checks. On VIP projects with the MCP connected: run *Verify deployment* first (finished, right commit, real plugin versions), ask **one** question *Purge the cache of the tested pages first (Recommended)* / *Skip* before the snapshot, and run *Health after the deploy* (at least 10 minutes after the deploy). Present the two lists as on staging. Something that **got worse** on production is a Failed result: say it plainly with the evidence and, on VIP, the previous deployment from the baseline, and let the developer decide (rollback in the VIP Dashboard or a revert). Never roll back yourself.

## Finish

1. Update `plugin-updates/YYYY-MM/plugin-updates-full.md`: final versions, skipped, failed/manual, staging and production results, the before/after comparison per environment, VIP platform health (VIP projects), notification results, Spam/Junk warnings, outstanding issues, final status, completion timestamp.
1b. Generate `plugin-updates/YYYY-MM/plugin-updates-summary.md` from the final report and state (template in `references/report-template.md`): short, plain language for non-technical stakeholders. No command output, logs, paths or secrets. Regenerate it whenever a plugin is updated later in the month (for example after a WordPress upgrade). Show it to the developer to share.
2. Final state: `COMPLETED` if everything passed; `COMPLETED_WITH_WARNINGS` if any Warning/Not Verified/Manual item remains; `FAILED` if a production check failed.
3. Show the final table (plugin, previous -> installed version, update type) and remaining manual actions.
4. **History commit.** The `plugin-updates/` folder (config, monthly state and reports) is meant to be **committed with the site**, so the repository keeps the maintenance history. Ask **one** question: *Commit the plugin-updates folder and push (Recommended)* / *Not now, I will do it*. On yes, run it yourself:
   1. Confirm the current branch is the updates branch (never the base branch). If the updates branch was already merged, do not commit: tell the developer to include the folder in their next change.
   2. Stage **only** `plugin-updates/` (`git add -- plugin-updates`). Its `.gitignore` already keeps artifacts, `local.env` and `node_modules` out. Show `git status --short` and stop if anything outside `plugin-updates/` is staged, or if a secret-looking file is staged.
   3. Commit with exactly this message and the same no-AI-attribution rule as the plugin commit: `docs(plugin-updates): update plugin updates report - YYYY-MM`.
   4. Plain `git push` (never force). Report the commit hash.
   If the repository is public, say so before the question: the folder holds site URLs and test results.
   Note for the developer: the folder is deployed together with the repository. It contains no secrets; if the deploy rules do not allow extra top-level folders, exclude `plugin-updates/` there.

## Pausing

The developer can stop at any time. Make sure state is saved, tell them the current phase and what to say to resume ("resume plugin updates").
