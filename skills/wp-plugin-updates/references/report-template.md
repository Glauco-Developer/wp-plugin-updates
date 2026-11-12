# Report template: `plugin-updates/YYYY-MM/plugin-updates-full.md`

Professional English. If the file already exists (for example a second run in the same month), **append** a new `## Maintenance Run N` section and keep earlier runs intact. Never delete history. Never include secrets.

The stakeholder summary is a separate file, `plugin-updates/YYYY-MM/plugin-updates-summary.md` (see the end of this template).

```markdown
# Plugin Updates - YYYY-MM

## Maintenance Run 1

### Project Information

| Field | Value |
|---|---|
| Project | |
| Maintenance month | YYYY-MM |
| Base branch | |
| Updates branch | plugin-updates/YYYY-MM |
| Execution date | YYYY-MM-DD |
| Current workflow state | |

### Plugin Updates

| Plugin | Previous Version | Target Version | Installed Version | Update Type | Status | Notes |
|---|---|---|---|---|---|---|

Statuses: Updated, Skipped, Failed, Manual Update Required, Already Up to Date.
**Update type** (Major, Minor, Patch or Unknown): compare the previous (installed) version with the target version using `MAJOR.MINOR.PATCH`. A change in the first number is **Major**, in the second **Minor**, in the third **Patch**. Four-part versions (`1.2.3.4`) use the first three numbers; a change only in the fourth is Patch. Pre-release tags (`-beta`, `rc`) are ignored for the comparison. Date-based, non-numeric or unknown target versions are **Unknown**, never guessed. Show it for every row that has a target version; leave `-` only when there is no update available.
Version columns are never `-`: always fill the installed version (WP-CLI or the `Version:` header); the target is a number or `unknown` (with the vendor named in Notes). Manual Update Required applies only to premium/licensed plugins; in-house plugins are Skipped.

### Manual Actions Required

- None / list

### Local Validation

| Test | URL | Result | Notes |
|---|---|---|---|

Local email delivery is Not Run (verified on staging).

### Staging Validation

| Test | URL | Result | Notes |
|---|---|---|---|

Results: Passed, Failed, Warning, Not Run, Not Verified, Manual Verification Required.

### Save Test (Local and Staging)

| Check | Result | Notes |
|---|---|---|

Results: Passed, Failed, Warning, Not Run (guard failed, disabled or skipped), Not Verified. For each environment state whether the test post was deleted.

### Form Notification Delivery

| Form | Test identifier | Result | Notes |
|---|---|---|---|

Results: Dispatch Confirmed by the plugin (Passed, inbox delivery not checked), Delivered to Inbox (Passed), Delivered to Spam/Junk (Warning), Not Found After Timeout (Failed), Mailbox Access Unavailable (Not Verified).

### Production Validation

| Test | URL | Result | Notes |
|---|---|---|---|

### Before/After Comparison

Each environment was checked right before its change and again after it. Only what got worse counts against the updates.

| Environment | Before snapshot | Pages | Got worse | Already there before | Visual changes | Result |
|---|---|---|---|---|---|---|
| Local | YYYY-MM-DD HH:MM | | | | | |
| Staging | | | | | | |
| Production | | | | | | |

Got worse (details):

- None / `page`: what changed (evidence)

Already there before (not caused by the updates):

- None / `page`: what was already broken

Visual changes are listed with the diff image path under `plugin-updates/YYYY-MM/artifacts/` (not committed). A visual change is a Warning until the developer confirms it is expected or a problem.

### VIP Platform Health

Only on WordPress VIP projects with the VIP MCP connected; otherwise write `Not Run (not a VIP project)` or `Not Run (VIP MCP not connected)`.

| Environment | Check | Before | After | Result |
|---|---|---|---|---|
| Staging | Deployment (commit) | | | |
| Staging | Plugin versions on the server | | | |
| Staging | PHP errors (new signatures) | | | |
| Staging | Slow queries (new) | | | |
| Staging | Response time P95 / 5xx | | | |
| Production | (same rows) | | | |

Production restore point: YYYY-MM-DD HH:MM / Skipped.

### Outstanding Issues

- None / list

### Final Maintenance Status

- Status: COMPLETED | COMPLETED_WITH_WARNINGS | BLOCKED | FAILED
- Completed: YYYY-MM-DD HH:MM (timezone)
```

Fill sections as phases complete; leave unreached sections as `Not Run`.
## Stakeholder summary: `plugin-updates/YYYY-MM/plugin-updates-summary.md`

Generated at Finish. Written for non-technical readers (clients, project managers). One page at most. No command output, logs, file paths or secrets. Same template for every run:

```markdown
# Plugin Maintenance Summary - YYYY-MM

**Site:** <project name>
**Result:** Completed | Completed with warnings | Blocked | Failed
**Completed:** YYYY-MM-DD

## Updated plugins

| Plugin | Previous version | New version | Type |
|---|---|---|---|
| <Name> | <old> | <new> | Major / Minor / Patch |

## Needs attention

- <Plain-language item: a plugin that must be updated manually, a check that could not be verified, an open issue>
- None

## Validation

| Environment | Outcome |
|---|---|
| Local | Passed / Passed with warnings / Not run |
| Staging | Passed / Passed with warnings / Not run |
| Production | Passed / Passed with warnings / Not run |

<One or two sentences: overall assessment and any recommended follow-up. When before/after snapshots were taken, say in plain words that the site was compared before and after each deploy and whether anything got worse (for example: "Staging and production were compared before and after the deploy; no new problems were found. One page already had a broken image before the update.").>
```
