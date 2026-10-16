# Approved bounded implementation

The user confirmed the business rule in the session plan, then approved local
implementation through the plan/autopilot transition. This records that scope,
not new permission for publication or hosted execution.

Implement only the name rule from docs/scenario.md:
- Enforce missing/null/non-string/empty/whitespace rejection in the store/API.
- Trim valid names and preserve description and transport behavior.
- Associate the exact inline UI error, focus the field, retain failed values,
  clear the error after correction, and announce accepted requests.
- Add unit/API/browser tests before the implementation; keep baseline tests.

Affected application files: src/requests.js, public/app.js, public/index.html.
Evidence files: test/requests.test.js, test/server.test.js,
e2e/request-submission.spec.js, and the BA/traceability/rehearsal documents.

Validate npm test and npm run test:e2e via npm run check. Inspect the bounded
diff against the deliberate starting checkpoint. Risks: UI-only validation, stale errors, state mutation
on rejection, name trimming regressions, false success after network failures.

No unrelated refactors, new runtime dependencies, remote publication, issues,
PRs, agent/review triggers, policy changes, merges, or destructive reset.
