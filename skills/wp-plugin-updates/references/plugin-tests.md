# Plugin test recipes

Used by `wp-plugin-tester`. Always: use the dedicated Playwright suite (the kit's `playwright/` folder, plus this project's own specs in `plugin-updates/playwright-project/`); never reuse or mix with other suites in the project. Plain page checks can be added there freely; anything bigger needs approval. Always run smoke tests (homepage plus a few representative public pages; HTTP 200, `h1`, non-empty title, no obvious console/asset errors).

Pages come from `plugin-updates/test-config.json` -> `plugins.<slug>.pages`. If missing and the recipe says "ask", return `NEEDS_INPUT` and the main agent saves the answer. The site's **key pages** (`testing.keyPages`, chosen by the developer in Setup) are always part of the smoke, SEO and before/after checks.

## Before/after snapshot

Answers "did the update make anything worse?" instead of "is anything wrong?". Read-only everywhere (GET page loads and screenshots only), so it is allowed on production.

**What is recorded per page** (home, key pages, plugin pages): HTTP status, title, meta description, robots, canonical, `og:title`, whether there is an `h1`, number of forms, amount of visible text, JavaScript errors, broken assets (CSS/JS/images/fonts answering 4xx/5xx) and a full-page screenshot (lazy content is scrolled into view first).

**Run it** from the skill's `playwright/` folder:

```bash
PLUGIN_UPDATES_PROJECT_DIR=<project root> PLUGIN_UPDATES_BASE_URL=<environment url> PLUGIN_UPDATES_MONTH=YYYY-MM \
PLUGIN_UPDATES_ENV=<local|staging|production> PLUGIN_UPDATES_SNAPSHOT=before npx playwright test
```

- `before` runs only the snapshot and stores it in `plugin-updates/YYYY-MM/artifacts/baseline/<env>/` (`<page>.before.json` + `<page>.png`). Nothing is compared, nothing fails because of what it finds; pages already returning errors are noted as pre-existing.
- `after` (same command with `PLUGIN_UPDATES_SNAPSHOT=after`) runs the comparison **and** the whole suite. Read `artifacts/playwright-summary-<env>-after.json`: `results` (Failed/Warning) and `preexisting`.

**How it is judged** (only the change matters):

| Change | Result |
|---|---|
| Page was 2xx/3xx, now 4xx/5xx; `h1` disappeared; fewer forms; visible text dropped by more than 40%; new broken assets | **Failed** (got worse) |
| New JavaScript errors; title/description/robots/canonical/`og:title` changed; screenshot differs by more than `testing.visual.maxDiffPixelRatio` (default 2%) | **Warning** (diff image path in the summary) |
| Same problem in before and after | **Pre-existing**: reported apart, never counted against the updates |
| No before snapshot for the page | **Warning** "no baseline", normal checks still apply |

A smoke or SEO test of the normal suite that fails on a page listed as pre-existing in the snapshot is reported as pre-existing too, not as a regression.

**Noisy pages.** Sliders, cookie banners, dates, random "related posts" or ads change on every load. Add their CSS selectors to `testing.visual.mask` (they are blacked out in both screenshots), or raise `maxDiffPixelRatio` for that project. Set `testing.visual.enabled` to `false` to keep the data comparison without screenshots. Suggest a mask to the developer (one question) when the same page shows a visual change on two runs in a row without any real difference.

Staging behind Basic Auth: the terminal run needs `PLUGIN_UPDATES_BASIC_AUTH_USER` / `PLUGIN_UPDATES_BASIC_AUTH_PASSWORD` exported by the developer (see below); without them the snapshot is Not Run.

| Plugin | Pages | Tests |
|---|---|---|
| **Form plugins** (see *Form plugins* below) | Saved form page, else auto-discover, else ask | Render; required fields; validation errors; field interactions (conditional logic, repeaters); with approval, **staging only**: submit unique test values, verify confirmation, verify the entry, verify the notification. Production: render + required-field checks, **no submit** |
| **Yoast SEO** (`wordpress-seo`) | Auto-discover: homepage, one internal page, one post/CPT (use sitemap `/sitemap_index.xml`, nav links) | Title, meta description, canonical, robots, Open Graph. Pages need not match each other |
| **ACF Pro** (`advanced-custom-fields-pro`) | Ask for pages using ACF fields or blocks | Content renders, blocks display, frontend functions |
| **FacetWP** (`facetwp`) | Ask for the filter page | Filtering, results, pagination, reset |
| **WPML / MultilingualPress** | Ask for translated pages | Language switcher, URLs, navigation, translated content |
| **WooCommerce** | Ask for product pages | Rendering, price, variations, safe staging cart. **Never real payments** |
| **Unknown** | Determine purpose from plugin headers/readme, propose tests, ask for pages | If no coverage: Manual Verification Required |

## Form plugins

Do not assume Gravity Forms. Find out which form plugin(s) the site uses: any **active** plugin in this table (from `wp plugin list`), plus any form markup found on public pages.

| Plugin | Slug | Form container | Where submissions are recorded |
|---|---|---|---|
| Gravity Forms | `gravityforms` | `.gform_wrapper form` | Entries (entry notes record the notification result) |
| Contact Form 7 | `contact-form-7` | `form.wpcf7-form` | Not stored by default (the Flamingo plugin stores messages) |
| WPForms / WPForms Lite | `wpforms`, `wpforms-lite` | `.wpforms-container form` | Entries (Pro) |
| Ninja Forms | `ninja-forms` | `.nf-form-cont` | Submissions |
| Fluent Forms | `fluentform` | `form.frm-fluent-form` | Entries |
| Formidable Forms | `formidable` | `.frm_forms form` | Entries |
| Forminator | `forminator` | `.forminator-ui` | Submissions |

Rules:

1. **Test every form plugin that was updated.** An active form plugin that was not updated this month is only mentioned.
2. **Form pages:** use `plugins.<slug>.pages` from the config. If missing, auto-discover by scanning the homepage, the main navigation and the sitemap for the containers above, then ask one question: *Use <page> (Recommended)* / *Choose another page* / *Skip*. Save the answer.
3. Render and required-field checks come from the Playwright suite (`tests/plugins/forms.spec.js`). Plugins not in the table fall under *Unknown* below.
4. Submissions follow the same approval rules for every form plugin (local without extra approval, staging with approval, production only through the opt-in test).

## Form notification check

1. Staging only, after explicit approval to submit.
2. Test values include a unique id, e.g. `WPU-YYYYMMDD-HHMM-<random>`, and a clearly marked test name.
3. **Default evidence, without opening any mailbox:** after the submission, open the entry or submission screen of the form plugin. Gravity Forms records the notification result in the entry notes (`Notification was sent successfully` = Passed, labelled *dispatch confirmed, delivery to the inbox not checked*; an error note = Failed). For other plugins, use their entry/submission screen or email log when it shows the notification result. When the plugin records nothing, the result is **Not Verified** (dispatch not confirmed).
4. **Mailbox check (only when the developer asks, preferably a dedicated test mailbox):** read the recipient and mailbox from `plugins.<slug>.notification` in config (mailbox URL and recipient). If missing, `NEEDS_INPUT`. Open the mailbox using an **existing authenticated session** or a flow the developer approves. Never bypass MFA, CAPTCHA, or permissions; never enter passwords found anywhere.
5. Search Inbox for the unique id; if absent, search Spam/Junk. Retry every `retryIntervalSeconds` until `timeoutSeconds`. Verify the email matches the submitted test (id, form name).
6. Result: Inbox -> Passed. Spam/Junk -> Warning (call it out explicitly). Not found after timeout -> Failed. No mailbox access -> Not Verified, ask for manual verification.
7. Never mark delivery Passed from the on-page confirmation alone.

## Local save test

Many updates break **saving**, not rendering (ACF field groups, Yoast metadata, block editor extensions). This is the only test that creates content, so it has strict guards.

**Guard (all must hold, else mark the test Not Run with the reason and stop):**

1. `testing.localContentTests` is not `false` in the config.
2. `wp option get siteurl` has a host that is clearly local: `localhost`, `127.0.0.1`, `*.test`, `*.localhost`, `*.local`, `*.lndo.site`, `*.ddev.site`. Anything else, including staging and production URLs, is **not** local.
3. The WP-CLI install is the project's own local copy (already confirmed during preparation).

**Procedure (WP-CLI, no browser needed):**

1. Create a draft: `wp post create --post_type=post --post_status=draft --post_title="WPU-TEST <YYYYMMDD-HHMM>" --porcelain`. Record its ID in `state.json` (`local.contentTest.postIds`) **before** doing anything else.
2. If **ACF** (`advanced-custom-fields` or `advanced-custom-fields-pro`) was updated: find a field group that applies to posts (`acf_get_field_groups`), set a value on its first simple field with `update_field`, and read it back with `get_field`. If no field group applies to posts, try a post type it does apply to, else mark Not Verified.
3. If **Yoast SEO** (`wordpress-seo`) was updated: set `_yoast_wpseo_title` and `_yoast_wpseo_metadesc` with `wp post meta update`, read them back.
4. Re-save the post with `wp post update <ID> --post_content="WPU-TEST body"` (this fires the `save_post` hooks of every active plugin) and read it back with `wp post get`.
5. Check the PHP/WP debug log for new fatals or errors that mention an updated plugin. New fatal or error = Failed; new deprecation notice = Warning.
6. **Always clean up**, even after a failure: `wp post delete <ID> --force` for each ID recorded in step 1, then set `deleted: true`. Delete only posts this run created.
7. Leftovers: at the start of the test, if the title prefix `WPU-TEST` exists from an interrupted run (`wp post list --s="WPU-TEST" --post_status=any`), delete those (local only) and say so.

Results: Passed (saved, read back, no new errors), Failed (save error, wrong value read back, new fatal), Not Run (guard failed or setting is `false`), Not Verified (no applicable field group or no way to read back). With a browser available on local, the same post can also be opened in the block editor to check for console errors, but that is optional.

## Staging save test

Same purpose as the *Local save test*, run on staging because staging is the closest copy of production. It is **opt-in every run** and only through the developer's logged-in Chrome tab in wp-admin. **Never WP-CLI on staging. Never on production.**

**Before asking**, check the Plugins screen for plugins that react to saving: external search sync (ElasticPress, WP Search with Algolia), audit/activity logs (WP Activity Log, Simple History), webhook or automation plugins. If any exist, say so in one line (a draft may be synced, logged or trigger a webhook) before the question.

**Question (one):** *Create a marked test draft to validate saving (Recommended)* / *Skip*. Run it only when ACF, Yoast or another plugin that adds fields or editor features was updated.

**Procedure:**

1. In the developer's tab: Posts -> Add New. Title `WPU-TEST <YYYYMMDD-HHMM>`. Save as **draft** and record the post ID and edit URL in `state.json` (`staging.contentTest`) immediately.
2. Fill the first simple field of an ACF box and/or the Yoast title and meta description in the editor.
3. **Save draft only.** Never Publish, Schedule or Update a live post. Reload the edit screen and verify the values persisted. Check for error notices and console errors.
4. **Always clean up**, even after a failure: Move to Trash, then Delete Permanently, for **this post only** (never empty the whole trash, never touch other content). Verify it is gone and set `deleted: true`.
5. If cleanup fails, report the post ID and edit URL to the developer so they can delete it, and mark the result at least Warning. Never leave it silently.

Results: Passed, Failed (save error, value not persisted, error screen), Warning (saved but cleanup needed or integration side effects seen), Not Run (skipped), Not Verified (session expired or no applicable field).

## Basic Auth for the Playwright suite (optional, terminal runs only)

The terminal suite does not share the developer's Chrome session. For staging it needs `PLUGIN_UPDATES_BASIC_AUTH_USER` / `PLUGIN_UPDATES_BASIC_AUTH_PASSWORD` exported by the developer (never asked in chat, never written to files or logs). Without them, staging checks go through the Chrome session. Local and production need none.

## Production restrictions

Production: GET-only public checks. Mark anything state-changing as "staging-only" or Manual Verification Required.

## Local validation

Environment: the local dev site (`wp option get siteurl` via `project.wpCli`). Order: environment checks first, then smoke, then the table above per plugin.

1. `wp plugin list --format=json`: updated plugins at `installedVersion`, active state unchanged from the inventory. Mismatch = Failed.
2. Site, `wp-admin` login page and each updated plugin's admin screen (when it has one) return 200 with no fatal. Check the PHP error / `debug.log` of the dev environment for new errors mentioning the updated plugin paths. New fatal or error = Failed; new deprecation notice = Warning.
3. Smoke tests on representative public pages against the local URL (dev certificates may be self-signed; allow that for local only).
4. Run the *Local save test* (see above) when ACF, Yoast or any plugin that adds fields or editor features was updated. Then the plugin recipes from the table above, using local pages. Form plugins: submissions allowed locally without extra approval; verify confirmation and that the entry exists (the plugin's Entries/Submissions screen, or `wp gf` for Gravity Forms); notification delivery is **Not Run** locally. FacetWP: confirm the index status is built, and note `FACETWP-INDEX-ISSUE.md` if present. Inactive plugins are not activated automatically: mark them **Not Run** (inactive) unless the developer approves activating them locally.
5. Local content may be empty or stale. Report a missing page as Not Verified, not Failed.

## Staging authenticated checks (developer's Chrome session)

Only when the developer authorized the *Staging session*. Same recipes as local, adapted:

1. Admin screens: open each updated plugin's admin screen (read only) and check for fatal or critical-error screens and visible admin notices about the update (DB upgrade prompts count as Warning: report, never click).
2. Form plugins: submit the approved form with a unique id, verify the confirmation, verify the entry in the plugin's Entries/Submissions screen, then the notification per *Form notification check* (webmail tab only when the developer asks).
3. Other plugins: ACF fields on edit screens, Post Expirator panel on a post edit screen (do not save the post), FacetWP index status, MultilingualPress switcher, Redirection list. Never save, publish, or delete content.
4. **Staging save test (opt-in every run, see below).**
5. Plugin versions: the admin Plugins screen lists installed versions; compare with `state.json` (this resolves versions marked Not Verified from the public check).

