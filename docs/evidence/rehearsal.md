# Evidence record: local candidate, not full acceptance

## Root relocation and customer-neutral presenter update

The repository was rebuilt with a fresh history and neutral checkpoint tags
`demo-start` and `demo-candidate`. npm run check passed all 14 Node and 5
Chromium tests. DEMO-GUIDE.md and the official-source ledger distinguish
documented controls from exercised features.

## Observed environment and checkpoints

- Windows; Node.js v22.20.0; npm 11.6.2; Git 2.55.0.windows.5.
- Playwright test package 1.64.0 with installed Chromium.
- demo-start: 39d7a6c, intentionally missing name validation.
- Runtime implementation candidate: 6713e7f, approved rule and its tests.
- demo-candidate: local app/docs/fixture reference; final commit is resolved by
  `git rev-parse demo-candidate`. Runtime source is unchanged from 6713e7f.
- demo-complete is deliberately withheld until required interactive rehearsal
  acceptance. This local checkpoint is not a production release.

## Actual validation

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

## Observed scope versus remaining gaps

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

## Remaining required acceptance

Run the documented main flow in VS Code and the Copilot app with an authorized
interactive user, record actual permissions/harness/context/approval/diff/test
evidence, and perform the manual accessibility pass. Update this record and the
presenter readiness table before calling the complete demonstration accepted.

Do not create/move demo-complete merely to remove a blocker. After those required
gates pass, create it at the accepted commit without overwriting an existing tag.
Hosted scenarios remain a separate conditional gate requiring separate approval.
