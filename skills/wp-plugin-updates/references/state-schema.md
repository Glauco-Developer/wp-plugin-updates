# State file: `plugin-updates/YYYY-MM/state.json`

Non-sensitive only. Never store credentials, tokens, cookies, or mailbox contents.

```json
{
  "version": 1,
  "month": "YYYY-MM",
  "project": "<project name>",
  "kitVersion": "<contents of the skill's VERSION file>",
  "baseBranch": "main | master | production",
  "updatesBranch": "plugin-updates/YYYY-MM",
  "phase": "PREPARATION | LOCAL_UPDATES | LOCAL_VALIDATION | AWAITING_STAGING_DEPLOY | STAGING_VALIDATION | AWAITING_PRODUCTION_DEPLOY | PRODUCTION_VALIDATION | COMPLETED | COMPLETED_WITH_WARNINGS | BLOCKED | FAILED",
  "blockedReason": null,
  "startedAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "approvedPlan": { "update": [], "skip": [], "manual": [] },
  "plugins": [
    {
      "slug": "",
      "name": "",
      "previousVersion": "",
      "targetVersion": "",
      "installedVersion": "",
      "updateType": "Major | Minor | Patch | Unknown",
      "status": "Updated | Skipped | Failed | Manual Update Required | Already Up to Date | Pending",
      "notes": ""
    }
  ],
  "local": { "status": "Not Run | Passed | Failed | Warning | Not Verified", "validatedAt": null, "baseline": null, "comparison": null, "results": [], "contentTest": { "postIds": [], "deleted": false } },
  "staging": { "status": "Not Run | Passed | Failed | Warning | Not Verified", "deployConfirmedAt": null, "baseline": null, "comparison": null, "vip": null, "results": [], "contentTest": { "postIds": [], "editUrls": [], "deleted": false } },
  "production": { "status": "Not Run | Passed | Failed | Warning | Not Verified", "deployConfirmedAt": null, "baseline": null, "comparison": null, "vip": null, "restorePointAt": null, "results": [] },
  "notifications": [],
  "outstandingActions": []
}
```

`results` entries (same shape for `local`, `staging` and `production`, with `environment` set to `local`, `staging` or `production`): `{ "test": "", "environment": "", "url": "", "status": "Passed|Failed|Warning|Not Run|Not Verified|Manual Verification Required", "notes": "" }`.

`baseline` (per environment, set when the before snapshot is taken): `{ "takenAt": "ISO-8601", "pages": 0, "status": "Taken | Not Run", "notes": "", "summary": "plugin-updates/YYYY-MM/artifacts/playwright-summary-<env>-before.json" }`. On VIP projects it also holds `"vip": { "deploymentId": "", "commit": "", "errorSignatures": [{ "signature": "", "count": 0 }], "slowQueries": [{ "query": "", "count": 0 }] }` (normalized, short, never full log lines).

`comparison` (set after the after snapshot): `{ "status": "Passed | Failed | Warning | Not Run", "worse": ["page: what got worse"], "preexisting": ["page: what was already broken"], "visualChanges": [{ "page": "", "diff": "artifact path" }], "summary": "plugin-updates/YYYY-MM/artifacts/playwright-summary-<env>-after.json" }`.

`vip` (staging/production, VIP projects with the MCP): `{ "deploymentId": "", "commit": "", "versionsVerified": true, "health": [{ "check": "", "before": "", "after": "", "status": "" }] }`.

Rules:
- Write after each phase change and each plugin result.
- A before snapshot recorded in the state is never retaken on resume once the environment's deploy has been confirmed (it would compare the new code with itself).
- On resume, a plugin with status other than `Pending` is **never** updated again; a form submission recorded in `staging.results` is **never** repeated without fresh approval.
- Resume consistency checks: current branch equals `updatesBranch` (or `baseBranch` if the updates branch was merged), `installedVersion` matches the version on disk, `phase` is compatible with the report.
