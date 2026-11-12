# wp-plugin-updates

**Monthly WordPress plugin updates, done safely, tested properly and reported automatically, by an AI agent that never touches production.**

A plugin for [Claude Code](https://claude.com/claude-code). You say one sentence. The agent updates your plugins one by one on a local copy of the site, tests them, hands you a clean commit, validates staging and production after *you* deploy, and writes the report your client or manager wants to read.

> "Start the monthly WordPress plugin updates."

---

## Why

Plugin updates are the most repetitive, most important and most boring job in WordPress maintenance. Done by hand it means: check what is outdated, update, click through the site, hope nothing broke, deploy, click through staging, deploy, click through production, write it all down. Every month, for every site.

Done carelessly (`wp plugin update --all` straight on production) it means a broken checkout on a Friday.

This plugin gives you the careful version, without the hours.

## What you get

- **Updates one plugin at a time**, locally, with the exact versions recorded. Never `--all`, never force flags.
- **Tests before anything ships.** A dedicated Playwright suite plus per-plugin checks (forms, search and filters, SEO metadata, language switching, PHP errors in the debug log).
- **Form checks for the plugin your site actually uses.** It detects Gravity Forms, Contact Form 7, WPForms, Ninja Forms, Fluent Forms, Formidable and Forminator, finds the form pages, and tests rendering and required fields. With your approval, it submits a marked test entry on staging and checks the plugin's own record of the notification. Opening a mailbox (Inbox vs Spam/Junk) happens only if you ask.
- **A local save test.** It creates a marked draft on your *local* site, saves it, fills ACF and Yoast fields, checks for errors, and deletes it. Updates that break saving are caught before anything is committed. It refuses to run on anything that is not clearly local. On staging the same test is opt-in each run, draft only, done through your own Chrome, and the draft is deleted afterwards.
- **Before and after every deploy.** Right before each change (local updates, staging deploy, production deploy) it takes a snapshot of your key pages: status, SEO tags, headings, forms, JavaScript errors, broken assets and a full-page screenshot. After the change it takes it again and compares. Only what **got worse** counts against the updates; anything that was already broken is reported as *pre-existing*, so old problems are never blamed on the plugins. Visual changes come with a diff image.
- **You choose the key pages.** On the first run it suggests the pages that matter (home, main menu items, a form page, a post) and you accept them or paste your own URLs.
- **WordPress VIP aware (optional).** On VIP sites with the VIP MCP connected it also confirms the deploy really shipped the updates commit, reads the real plugin versions on staging and production, and compares PHP errors, slow queries, response time and 5xx before and after the deploy. Read-only, plus two opt-in actions (a production restore point and a cache purge of the tested pages). It never deploys or rolls back.
- **A clean commit** that lists only the updated plugins and their versions.
- **Staging and production validation** after you deploy. Production is read-only by default.
- **Two reports**: a full technical report and a one-page summary for stakeholders.
- **Resumable.** Close the laptop mid-run, come back tomorrow, say "resume plugin updates" and it continues exactly where it stopped, without repeating any update.
- **Works with any host.** The plugin folder, WP-CLI command and protected paths are detected from your repository and local setup, so it does not depend on where the site is hosted.

## How it works

```
 1. PREPARE      Checks you are on the base branch with a clean tree,
                 creates the branch plugin-updates/YYYY-MM
 2. INVENTORY    Lists every plugin: current version, available version, status.
                 Core, themes, MU-plugins and protected plugins are never touched
 3. UPDATE       Updates each plugin individually and verifies the version
                 and the Git diff after every step
 4. TEST LOCAL   Playwright suite + plugin-specific checks on your local site
 5. COMMIT       One commit, only the updated plugins. You approve it. Pushes the branch
                 (plain push, never force). No PR, no merge
 6. STAGING      Before snapshot of staging. YOU deploy. The agent verifies the
                 deployment landed, tests staging (using your own logged-in Chrome
                 session) and compares it with the before snapshot
 7. PRODUCTION   Before snapshot of production. YOU deploy. The agent runs read-only
                 checks, compares with the before snapshot and, only if you say yes,
                 an optional form submission test
 8. REPORT       Full report + stakeholder summary
```

Every phase saves its state to disk, so an interruption never costs you work.

## Safety first

This agent is deliberately limited. It will **never**:

- deploy, merge, force-push, reset or rebase,
- update WordPress core, themes, MU-plugins, drop-ins or protected plugins,
- update a plugin that carries a "do not update" notice (in its header, its files or your project docs). It is left out and you are told exactly what the notice says and where it was found,
- run updates or WP-CLI against staging or production,
- ask for, type, store or print passwords, tokens or cookies,
- claim a test passed without actually running it.

Results use a fixed vocabulary (Passed, Failed, Warning, Not Run, Not Verified, Manual Verification Required), so a report never hides what was not checked. Premium plugins without a license, custom plugins and Composer-managed plugins are listed for manual handling instead of being forced.

## What the reports look like

| Report | For | Contents |
|---|---|---|
| `plugin-updates-full.md` | You and your team | Every phase, every plugin, test results per environment, notes, outstanding issues |
| `plugin-updates-summary.md` | Clients and managers | Result, updated plugins (previous to new version), what needs attention, validation outcome per environment. Plain language, one page |

## WordPress VIP (optional)

On sites hosted on WordPress VIP the agent can use WordPress VIP's own MCP server (*Secure MCP*, toolset *VIP MCP*) to see the platform: deployments, plugin versions on the server, PHP logs, slow queries and metrics. Without it everything still works; the report just says the platform checks were not run.

One-time setup:

1. An Org admin activates **Secure MCP** in the VIP Dashboard (Integrations) and enables the **VIP MCP** toolset for the application's environments. It is off by default.
2. Connect it in Claude Code (a browser window opens to authorize with your VIP Dashboard account):

```bash
claude mcp add --scope user --transport http vip-platform https://api.wpvip.com/mcp
```

The agent acts with **your** VIP Dashboard permissions. It is limited by its instructions to read-only tools plus two opt-in actions, but the token can do whatever your role allows. We recommend also blocking the destructive tools in your own Claude Code settings (`~/.claude/settings.json`), so nothing can call them by mistake:

```json
{
  "permissions": {
    "deny": [
      "mcp__vip-platform__environment_rollback",
      "mcp__vip-platform__environment_retire",
      "mcp__vip-platform__environment_create_child",
      "mcp__vip-platform__environment_deploy_start_custom",
      "mcp__vip-platform__environment_sync",
      "mcp__vip-platform__environment_sql_import_start",
      "mcp__vip-platform__environment_domain_remove",
      "mcp__vip-platform__environment_domain_set_primary",
      "mcp__vip-platform__environment_update_software_versions",
      "mcp__vip-platform__organization_remove_user",
      "mcp__vip-platform__organization_invite_user",
      "mcp__vip-platform__execute"
    ]
  }
}
```

(The prefix `mcp__vip-platform__` matches the server name used in the command above.) VIP also asks for a browser confirmation (step-up) before high-impact actions, and every MCP call is listed in the VIP Audit Log under your name.

## Install

Inside Claude Code:

```
/plugin marketplace add Glauco-Developer/wp-plugin-updates
/plugin install wp-plugin-updates@wp-plugin-updates
```

Requirements: Git, Node.js, and a local environment for the site (Lando, DDEV, Docker, LocalWP or similar). The first time you run the tests, the agent asks before installing the Playwright dependencies; you only answer yes.

## Use

1. Open the site's repository on its base branch (`main`, `master` or `production`) with a clean working tree.
2. Say: **Start the monthly WordPress plugin updates.**

On a site that has never used it, the first run does a one-time setup: it detects the plugin folder and WP-CLI command by itself, then asks for the staging and production URLs once (you can skip either). Everything lives in a `plugin-updates/` folder inside that site. Nothing from this plugin is ever copied into your repository.

## What you need open

Most of the run is automatic and needs nothing from you but a yes. Staging checks that need a login use **your own Chrome**:

| For | You need |
|---|---|
| Local updates and tests | Nothing in the browser. Just your local site running |
| Staging admin checks and form tests | Chrome open with the **Claude in Chrome** extension installed and signed in, the staging site open in a tab and logged in to wp-admin (including Basic Auth, if the site has it) |
| Mailbox check (optional) | Your webmail open and logged in, in another tab, preferably a dedicated test mailbox |
| Production | Nothing. Public read-only checks. The optional form test uses the same Chrome session |
| VIP platform checks (optional) | The VIP MCP connected once in Claude Code (see *WordPress VIP*) |

The before/after snapshot runs from the terminal, not from your Chrome. If staging is behind Basic Auth, export `PLUGIN_UPDATES_BASIC_AUTH_USER` and `PLUGIN_UPDATES_BASIC_AUTH_PASSWORD` in your shell before the run; otherwise the staging snapshot is skipped (the rest still runs).

The agent never asks for or types your passwords, never bypasses MFA or CAPTCHA, and only uses the tabs you opened. If you prefer not to open Chrome, choose "Public tests only": the checks that need a login are listed as Manual Verification Required instead.

## Update

```
/plugin marketplace update wp-plugin-updates
```

Restart Claude Code afterwards. Each run reports the version in use.

## What lives in each site

Only the site's own data, **committed with the site** so the repository keeps the maintenance history (the agent asks before committing it): `plugin-updates/test-config.json`, `plugin-updates/YYYY-MM/` (state and reports), and optionally `plugin-updates/playwright-project/` for tests that belong to that site alone.

## For maintainers

```
.claude-plugin/
  plugin.json       plugin manifest (name, version)
  marketplace.json  makes this repository installable as a marketplace
skills/wp-plugin-updates/
  SKILL.md          the workflow (phases, rules)
  roles/            instructions for the two roles: updater and tester
  references/       project discovery, plugin test recipes, report and state formats
  playwright/       shared test suite (needs PLUGIN_UPDATES_PROJECT_DIR = project root)
  templates/        files created in a new site's plugin-updates/ folder
agents/             thin subagent files that point to roles/
```

Edit the files, bump the version in `.claude-plugin/plugin.json` and `skills/wp-plugin-updates/VERSION`, commit and push. To try local changes without pushing:

```bash
claude --plugin-dir /path/to/wp-plugin-updates
```

Contributions are welcome: new per-plugin test recipes and bug reports.

## Remove

```
/plugin uninstall wp-plugin-updates@wp-plugin-updates
```

## License

[MIT](LICENSE)
