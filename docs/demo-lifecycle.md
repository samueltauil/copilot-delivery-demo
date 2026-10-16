# Repeat without destroying evidence

The immutable `demo-start` tag is deliberately missing the name rule.
The `demo-complete` tag is reserved until all required acceptance gates, including
primary-interface rehearsals, are satisfied. Until then, `demo-candidate` denotes
the locally validated implementation reference. Neither is a production release.
Never move an existing checkpoint tag.

From the canonical repository in PowerShell, choose NEW branch/path names:

```powershell
git status --short
git worktree add -b demo/local-one/start .demo-runs\local-one\worktree demo-start
Set-Location .demo-runs\local-one\worktree
npm ci
npx playwright install chromium
npm run check
npm start
```

Stop if the branch/path exists or the worktree is dirty/unexpected. Do not use
reset --hard, forced worktree removal, force pushes, or wildcard deletion.
Baseline passing tests do not prove the absent rule. Follow the approved plan,
add rule-specific failing tests, implement, review the diff, and validate.

For W2/W3, create a NEW worktree from demo-complete once available. Before its
acceptance gate, use the explicitly recorded demo-candidate and label the run
as a local candidate rehearsal, not a fully accepted completed demonstration.
Then:

```powershell
git apply --check docs\fixtures\review-whitespace-regression.patch
git apply docs\fixtures\review-whitespace-regression.patch
node --test --test-name-pattern="whitespace regression" test/server.test.js
# Expected failure. Record it, retain the tests, and request review only if approved.
git apply --check docs\fixtures\review-whitespace-correction.patch
git apply docs\fixtures\review-whitespace-correction.patch
npm run check
```

Those fixtures are intended for the candidate/completed code, not the deliberate baseline.
Never apply them in the canonical completed worktree.

Keep a manifest containing run ID, checkpoint/actual SHA, worktree, branch refs,
approvals, issue/PR IDs, active settings, observed outcomes, and cleanup inventory.
Git checkout cannot reset hosted issues, reviews, usage, or billing.

Do not merge demo PRs into canonical checkpoints. Cleanup requires approval for
the exact run-owned resources. Cancel active agents before closing resources;
restore only run-owned settings after checking for intervening admin changes.
Remove a specifically identified clean worktree with `git worktree remove PATH`
from the canonical repo; retain evidence and never use broad deletion.
