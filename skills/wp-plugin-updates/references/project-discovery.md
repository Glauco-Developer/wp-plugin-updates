# Project discovery

The workflow is identical for every site and every host. Only these things change: where plugins live in the repo, how WP-CLI is run locally, which paths are platform-managed (protected), and how deploys happen (always done by the developer).

Store the result in `plugin-updates/test-config.json` under `project`. Detection is a suggestion: verify it with a harmless command (for example `wp core version`) and ask the developer only for what fails or cannot be found.

## Repository layouts

Do not assume where plugins live. Common cases:

| Layout | Example plugin path |
|---|---|
| Repo root is `wp-content` | `plugins/<slug>/` |
| Repo root is the WordPress site root | `wp-content/plugins/<slug>/` |
| Composer/Bedrock style | `web/app/plugins/<slug>/` (Composer-managed ones need manual handling) |
| Plugins not tracked in Git | Updates would not appear in a diff: stop and ask the developer how deploys work |

A directory is a plugin directory when its subfolders contain a PHP file with a `Plugin Name:` header. Always confirm the result with the developer.

## Discovery order

Discover first, then ask only for what could not be found, **one question at a time**:

1. Plugin directory: look for a folder whose subfolders contain a PHP file with a `Plugin Name:` header.
2. Local WP-CLI: try the order in `roles/updater.md` (Lando, DDEV, Docker, host `wp`).
3. Protected paths: apply the safe defaults and do not ask: WordPress core, themes, any `mu-plugins` or `*-mu-plugins` directory, drop-ins (`object-cache.php`, `db.php`, `advanced-cache.php`), `vendor/`, and plugins that the platform provides (often listed as ignored in `.gitignore`). Custom plugins have no remote update source and are skipped.
4. Staging and production URLs: asked once in Setup, skippable.
5. Deploys are always done by the developer; never ask how, just say that the developer deploys. After a deploy, remind the developer to purge caches. If the server runs automatic plugin updates, tell the developer, since server-side updates can cause version drift.
6. If the plugin updates would not show up in a Git diff (plugins not tracked in Git), stop and ask how deploys work.
7. WordPress VIP: a `vip-config/` or `client-mu-plugins/` folder at the repository root means a VIP codebase (`client-mu-plugins/` is already protected by rule 3). Optional platform checks through the VIP MCP are described in `references/vip-platform.md`; record the result under `vip` in the config.

## Required fields in `project`

```json
{
  "configured": true,
  "name": "project name",
  "wordpressRoot": "path to the WordPress root as seen by WP-CLI",
  "pluginsDir": "repo-relative plugin directory",
  "wpCli": "command prefix used for WP-CLI, e.g. 'wp', 'lando wp', 'ddev wp'",
  "protectedPlugins": ["slugs never updated"],
  "protectedPaths": ["repo-relative paths never modified"],
  "allowedBaseBranches": ["main", "master", "production"]
}
```

`allowedBaseBranches` must not be widened by the agent; only the developer may edit it deliberately.

## Do-not-update notices

Some companies mark a plugin that must stay on its current version (customized, patched, pinned for compatibility) with a written notice instead of a tool setting. Before proposing any update, scan for it (read-only):

- `Update URI: false` in the main plugin file header.
- Comments in the main plugin file, and root-level `README*`, `*.md`, `*.txt` or `DO-NOT-UPDATE*` files in the plugin folder.
- The project's own docs and config (`README*`, `CONTRIBUTING*`, `CLAUDE.md`, `AGENTS.md`, `docs/`, comments in `.gitignore` or `composer.json`) mentioning the plugin.
- Wording in any language: "do not update", "don't upgrade", "customized/modified/patched version", "local changes", "não atualizar", "no actualizar", "ne pas mettre à jour", "nicht aktualisieren".

A plugin with a notice is **never updated automatically**. It is reported with the quoted notice and its location, listed under *Skipped* in the report with the notice in Notes, and the developer is told in plain words. When the wording is ambiguous, treat it as a notice and ask. Only the developer's explicit "Update anyway" overrides it, for that run.

## Plugin classes

| Class | Handling |
|---|---|
| wp.org / updater-capable | `wp plugin update <slug>` |
| Premium with license key (for example ACF Pro, Gravity Forms, SearchWP, Relevanssi Premium) | Try the individual WP-CLI update only if the update is listed as available. If the license/updater is missing, mark **Manual Update Required**; do not hack around it |
| Carries a do-not-update notice | **Skipped**: quote the notice, tell the developer, never update unless the developer explicitly overrides |
| Custom / in-house | Not updatable remotely: **Skipped** (no update source) |
| Composer-managed | Manual handling via Composer, report as such |
