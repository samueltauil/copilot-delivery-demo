# Rehearsal evidence

## ScanLab realistic phantom: BrainWeb-derived brain slice

The geometric phantom was replaced by KomaMRI's bundled `brain_phantom2D`
(BrainWeb-derived, axial, 11,554 spins at `ss=3`) on a 96 × 96 grid; see
[credits](../credits.md). No external dataset was downloaded or added.

| Check | Observed result |
|---|---|
| `npm run scanlab:check` | Julia suites passed; 10 Node tests passed; 9 Chromium tests passed, zero retries |
| Actual live comparison | No-motion baseline `a732f1fe-0d50-4315-9c8b-2ac898e89837`; final larger-shift run `4d3041a9-5870-468c-8a0a-a9f121f1dbc9` |
| Independent DICOM reader | All 9,216 row-major pixel values decoded by `dicom-parser` matched the reported pixels |
| Visual inspection | Workbench screenshot: upright brain (anterior at top); 16 mm shift shows visible ghosting and blur beside the clean baseline |
| Failure retained | First full run failed the exact repeat-pixel assertion: 15–23 of 9,216 pixels differed by one 16-bit step. Cause: NFFT threaded gridding under two Julia threads. Reconstruction now disables NFFT threading; six repeats were bit-identical and the assertion was kept unchanged |
| Failure retained | Browser test hit its 30 s limit with three 96 × 96 runs; that test now allows 120 s and compares all decoded rows in one assertion |

## ScanLab DICOM workbench: October 20, 2026

Local implementation in the current checkout; no commit, push, hosted workflow,
issue, PR, deployment, settings or permission change was performed for this work.
The fixed phantom and three CPU motion presets remain unchanged.

| Check | Observed result |
|---|---|
| Pinned DICOM environment | DICOM.jl 0.11.0 resolved and instantiated; existing imaging versions unchanged |
| Julia science | 57 assertions passed, including all three actual simulations, original reconstruction comparison, and bounded DICOM quantization |
| State / DICOM / HTTP | 39 state, 26 DICOM and 46 HTTP assertions passed |
| Canvas / developer checks | All 9 Node tests passed, including snapshot restoration and shared Canvas adapter lifecycle |
| Independent DICOM reader | `dicom-parser` 1.8.21 parsed downloaded bytes; file-meta length, file/dataset UIDs, syntax, pixel type, all 9,216 row-major pixel values and rescaling matched |
| `npm run scanlab:e2e` | 9 Chromium tests passed, exit 0, zero retries |
| Actual live comparison | No-motion baseline `a01fc6ac-c660-4c5a-8588-b7c7c075c6af`; final larger-shift run `64461652-de8d-4fb5-93d6-29387a97b832` |
| Baseline invariants | Entire baseline state, DICOM bytes/hash, decoded pixels and displayed pixel matrix unchanged through Controlled shift and Larger shift |
| Responsive inspection | 1280, 520 and 390 px overflow checks passed; desktop and 390 px screenshots visually inspected |
| Preserved request desk | `npm run setup` and `npm run check` passed, including 137 Julia assertions, 7 Node tests and 11 browser tests |
| Design checks | Final mechanical detector returned no findings; repeated rebuttal-style copy was simplified |
| Existing Copilot Canvas | Extension reloaded and registered; `scanlab-validation` reopened with the workbench title. Native `get_state` returned `workflowVersion: dicom-v1`, idle, no result or baseline, and no error |

Failures were retained and corrected: an initially chosen upstream-master DICOM
version was unavailable in the registered environment, so the registered 0.11.0
release was pinned; a helper-scoping mistake was exposed by the new tests and
fixed. A browser run used a service started before the workflow-version guard
was added and failed seven checks. Restarting the isolated test service restored
all nine tests. No assertions were skipped, weakened, or retried to hide failures.
A final teaching-fixture check caught missing trailing patch context after the
new linked controls were disabled in the teaching start. The hunk was corrected;
the fixture application and exact-restoration test passed again.

Actual Copilot-app GUI verification remains **unverified**. Prior Computer Use
inspection was rejected by host safety policy; this implementation session's
Computer Use tool discovery exposed no tools. Browser automation and adapter
tests are not presented as a successful app rehearsal. The existing service
must be restarted by its owner after future code changes; an older backend now
produces an explicit version error instead of presenting old results as verified
DICOM. The existing Canvas was reopened and its native state action confirmed a
fresh DICOM-aware session, not a visual GUI check.
The manual readiness automation definition and app-first presenter guide were
updated; no app automation was created or scheduled. DICOM evidence is bounded
interoperability testing, not standard conformance certification or clinical
validation.

## JuliaHealth migration: October 18, 2026

Validated the local working tree based on `10ca828`; these changes were not
committed or published. The old `demo-start` and `demo-candidate` tags remain
unchanged. No Julia completion tag or hosted execution is implied.

Environment: Windows, Julia 1.10.12, Node 22.20.0, npm 11.6.2,
Playwright 1.64.0/Chromium. Julia was downloaded from the official distribution,
SHA-256 verified, and extracted under the ignored local tools directory.
No global PATH or shared package environment was changed.

Pinned manifest SHA-256:
`ccdddacb21f88363fb6650440986f4f16810e9c7d78aa0226cb2cbeaa2d727a3`.

### Observed results

| Check | Actual outcome |
|---|---|
| Original `npm run check` before migration | 14 Node tests and 5 Chromium tests passed |
| JuliaHealth reuse spike | Registered HealthSampleData download/checksum succeeded; OCC returned 2,694 people and 1,677 distinct people for concept 28060 |
| `npm run setup` | Passed with the prepared cache; printed verified counts and the actual data-cache path |
| Final `npm test` | 137 Julia assertions passed: 39 store, 84 HTTP, 14 study; all 7 Node tooling tests passed |
| Final `npm run test:e2e` | All 11 Chromium tests passed; all 5 original browser tests retained unchanged |
| Final `npm run check` | Passed, exit 0; no skipped assertions and no Playwright retries |
| First submission after startup warm-up | Original five-second assertion passed; the final first browser scenario completed in 1.2 seconds |
| Desktop/mobile layout | 1280px and 390px checks passed without horizontal overflow; generated screenshots inspected |
| Starting fixture, final-source rehearsal | Exactly 23 name-rule assertions failed; no unrelated Julia test errors. Reversing the fixture restored all application/tooling checks |
| Actual starting API probe | Whitespace-only name returned HTTP 201, demonstrating the deliberate gap; the completed API tests require HTTP 400 |
| Review fixture, final-source rehearsal | Exactly 8 name/whitespace assertions failed; correction restored all 137 application assertions |
| Cached execution | Corrected start passed with package offline mode and outbound HTTP/HTTPS proxies pointed at an unavailable loopback port, excluding the local server. This was not a physical network-disconnection test |
| Missing-data startup | `npm start` exited 1, logged the setup error, and did not create a database or serve fallback counts |
| Dataset immutability | Exact checksum unchanged after real-data query tests; tiny fixture confirms duplicate condition records do not inflate the people count |
| Snapshot isolation | Allowlisted copies exclude private context, installed dependencies, data caches, prior runs and Git history; unsafe/reused names rejected |
| Diff and cleanup | `git diff --check` passed; inspection server stopped; only task-owned rehearsal copies are removed, not reusable runtime/data/package caches |

### Failures found and fixed, not hidden

- HealthSampleData's upstream/default-branch UUID differed from the registered
  release. Initial package resolution failed; the General registry identity was
  used and the registered release pinned.
- HTTP.jl's requested port zero was not the bound ephemeral port. Tests exposed
  the issue; the library's `listenany` path is used only for port-zero tests.
- Bounded HTTP reads initially treated a partial read as a complete body, then
  oversized responses closed before flushing. Both were fixed and ordinary and
  chunked transport cases pass.
- Git initially reported successful fixture application while skipping paths
  under an ignored nested directory. Rehearsal revealed a falsely green start.
  The helper now bounds Git's parent discovery, verifies an actual source
  difference, and is tested inside the repository, not only a system temp folder.
- The first review rehearsal failed a preparation check before reaching the
  business assertions. Application tests now run first; the final red rehearsal
  explicitly checks for the intended Julia name failures, not just exit code 1.
- JSON3 accepted trailing garbage after a valid object. It was replaced with
  JSON.jl's strict root parser; malformed, trailing, multiple-document and
  non-finite-number tests remain in the suite.
- First-request Julia compilation exceeded the existing browser assertion.
  Startup now warms the real byte-buffer parsing path in a disposable store.
  A string-only warm-up was insufficient and was corrected. No browser assertion
  timeout was increased and no retry was added to mask the failure.
- Windows temporarily locked a generated fixture file during test cleanup.
  Cleanup now uses Node's bounded `rm` retries for transient filesystem locks;
  persistent failure still fails the test. The final combined gate passed.

### Not claimed

The pinned GitHub Actions workflow was authored locally, not run on GitHub.
No pushes, new issues/PRs, assignments, review requests, policy changes, merges
or hosted cleanup were performed for this migration.

VS Code's integrated browser was inspected, and isolated Chromium interaction/
layout checks were executed. This is not a human Copilot Ask/Plan/Agent rehearsal,
screen-reader audit, accessibility certification, clinical validation, or a
production/compliance assessment. The presenter still rehearses the actual
account/harness and audience timing. No particular YouTube video was verified.

## Historical Node-era records

The remaining entries describe the earlier Node implementation. They are
retained as history, not current Julia readiness evidence.

### Root relocation and customer-neutral presenter update

The repository was rebuilt with a fresh history and neutral checkpoint tags
`demo-start` and `demo-candidate`. npm run check passed all 14 Node and 5
Chromium tests. DEMO-GUIDE.md and the official-source ledger distinguish
documented controls from exercised features.

### Observed environment and checkpoints

- Windows; Node.js v22.20.0; npm 11.6.2; Git 2.55.0.windows.5.
- Playwright test package 1.64.0 with installed Chromium.
- demo-start: 39d7a6c, intentionally missing name validation.
- Runtime implementation candidate: 6713e7f, approved rule and its tests.
- demo-candidate: local app/docs/fixture reference; final commit is resolved by
  `git rev-parse demo-candidate`. Runtime source is unchanged from 6713e7f.
- demo-complete is deliberately withheld until required interactive rehearsal
  acceptance. This local checkpoint is not a production release.

### Actual validation

| Check | Observed outcome |
|---|---|
| Baseline npm run check before demo-start | 10 Node tests and 3 Chromium tests passed |
| Name-rule tests before implementation | 4 intended failures; 10 baseline passes; no skipped/cancelled tests in the corrected red run |
| Completed-rule npm run check | 14 Node tests and 5 Chromium tests passed |
| Two unique local draft preparations | local-replay-one and local-replay-two; independent ignored manifests/drafts; no network or Git mutations from generator |
| Two demo-start worktree probes | Actual API accepted a missing name with HTTP 201, proving the intentional gap |
| Two isolated candidate regression replays | Each whitespace API test failed with actual HTTP 201 versus expected 400 |
| Two correction replays | Each restored all 14 Node tests; corrected worktree diff was empty |
| Temporary worktree cleanup | All four specifically created clean baseline/candidate worktrees removed through git worktree remove |

An initial editing error nested new tests under another test; it was corrected
before the recorded red run. That erroneous run is not presented as evidence of
the intended business-rule failure.

Generated local details remain ignored at `.demo-runs\local-replay-evidence.txt`
in the authoring checkout; they are not required by a fresh clone. The committed
tests and fixture/runbook reproduce the checks.

### Observed scope versus remaining gaps

| Surface/requirement | Status | Evidence or blocker |
|---|---|---|
| Authoring Copilot CLI session | Local implementation, commands, diff and tests observed | Current session performed scoped local edits, recorded commits and validation; not a second independent interactive rehearsal |
| VS Code | Documented; NOT interactively rehearsed | code.cmd exists, but binary presence is not evidence of account/harness/permission/UI behavior |
| Copilot desktop app | Documented; NOT interactively rehearsed | App access, mode/permission controls, Changes and command path not observed |
| Full manual accessibility pass | NOT performed | Chromium tests assert labels, association, focus, keyboard flow and status markup; no actual screen-reader/user audit |
| GitHub.com issue -> agent PR | Prepared; NOT hosted exercised | Publication, resource creation and assignment remain separately approved |
| Manual Copilot PR review | Prepared; NOT hosted exercised | No review requested; no review findings invented |
| Automatic review | Optional; NOT configured/exercised | Requires approved policy/admin setup and actual trigger evidence |
| Mobile/other IDEs | Documented; NOT exercised | No compatibility or synchronized-state claim |
| Admin reporting/cost | Guidance only | No tenant data/access or measured savings |

### Remaining required acceptance

Run the documented main flow in VS Code and the Copilot app with an authorized
interactive user, record actual permissions/harness/context/approval/diff/test
evidence, and perform the manual accessibility pass. Update this record and the
presenter readiness table before calling the complete demonstration accepted.

Do not create/move demo-complete merely to remove a blocker. After those required
gates pass, create it at the accepted commit without overwriting an existing tag.
Hosted scenarios remain a separate conditional gate requiring separate approval.

### Hosted scenarios observed (run live-w1, live-w2)

Executed on the public demo repo with the owner's explicit request. Nothing merged.

- W1: issue #1 (base `demo/live-w1/base` = `demo-start`) assigned to Copilot with
  that base branch. Its first run left only a draft plan commit; a PR comment nudge
  produced PR #2 with source, UI and test changes. Local check of the PR head:
  12 Node tests passed; 1 of 4 Chromium tests FAILED (a locator count assertion),
  so the agent PR needs human review/correction. Not merged.
- W2: PR #3 (`demo/live-w2/head` -> `demo/live-w2/base` = `demo-candidate`) with the
  whitespace regression fixture. Copilot code review, requested via the
  requested_reviewers API, flagged the whitespace-only regression on src/requests.js
  as a high-severity finding. AI findings are not guaranteed; tests remain the
  deterministic evidence.
- W3 (automatic review ruleset): NOT configured; no rulesets exist in the repo.

### Still requiring a human at the keyboard

Interactive VS Code and Copilot app rehearsals and the manual accessibility pass
cannot be performed by an agent. The `demo-complete` tag stays withheld.
