# Web-first scenarios: templates are not triggers

Draft generation does not verify that the referenced checkpoint tags exist
in the target repository.

No hosted execution is included in local preparation. Publishing, creating
issues/PRs, agent assignment, reviews, workflow execution, policy edits, and
cleanup each require separate approval. Automatic policy can trigger at publish
time: inspect effective personal/repository/inherited settings BEFORE pushing.

## Prepare local drafts

```powershell
npm run demo:prepare -- --repo example/demo --run web-one --scenario w1 --base demo/web-one/base --head demo/web-one/head
```

Replace example/demo and use unique run IDs. `.demo-runs\web-one` contains
issue.md, pull-request.md, and manifest.json. The generator performs no network
or Git action, does not verify refs, and refuses reused run IDs. A prefilled link
opens an editable draft, not a created issue. If manifest says to paste the body,
copy issue.md rather than assuming a truncated URL includes all requirements.
Compare links work only after the intended branches have been approved/pushed.

Templates must be published to the remote default branch for the issue chooser.
Do not preassign Copilot or assume labels/reviewer query parameters trigger it.
Record actual SHAs and remote IDs; generator state stays prepared-local until
the facilitator records real evidence.

## W1: issue -> implementation PR

Use a NEW run base at demo-start (not completed main). Review the populated
validation issue, obtain scope/remote/agent approval, create the issue, then use
Copilot assignment and select the correct starting/base branch. Confirm its
actual SHA; stop if base selection is unavailable rather than silently using main.

Observe agent activity and its linked PR, inspect changed files, and record
actual tests/errors. Browser setup may require separate permitted workflow
execution or local validation; do not claim cloud checks ran if they did not.
PR review is a separate optional request, not a consequence of the issue template.
Do not merge the PR into canonical checkpoints.

## W2: manual PR review

Use a NEW completed-base worktree and the whitespace regression fixture from
docs/demo-lifecycle.md. Keep the failing test and record it. After publication
approval, create a PR with the template, then request Copilot in PR Reviewers.
The tracking issue is optional and does not itself request a review.

Record reviewed commit, actual comments (including none), and human disposition.
Copilot may miss the seeded defect; tests are deterministic evidence. After
approval, correct it, validate, and request re-review. Replies to review comments
are not a reliable instruction channel for the reviewer. A separately approved
implementation task is different from reviewing.

## W3: automatic review

Use a separate run/PR so manual and automatic triggers are not confused.
Verify entitlements, admin rights, billing, effective personal settings and
repository/inherited rules. With separate admin approval, snapshot the current
configuration and narrowly target the demo base namespace using native rules.

Choose draft/new-push behavior explicitly. Default to a ready-for-review PR
without draft or new-push review unless deliberately approved. Obtain approval
before the publication event that will trigger review. Observe an actual review
of the correct commit without a manual request. For optional push re-review,
approve that setting and verify the new commit was reviewed.

If blocked, record unavailable and use W2; do not add an unreviewed Actions
workaround. Personal settings do not override inherited rules. Restore only
approved run-owned changes, not unrelated admin settings.

## Evidence and reset

Record run ID, owner/repo, immutable starting SHA, proposed AND observed refs,
issue/PR IDs, trigger, policies, permissions, exact commands/results, comments,
human decisions, and cleanup list. New runs get new resources; old runs remain.
No auto-merge, forced reset, broad branch deletion, or invented successful review.
Local draft tests do not prove GitHub rendered templates or executed Copilot.

Official references (recheck capabilities and account policy):
`https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/kick-off-a-task`
`https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/copilot-code-review`
`https://docs.github.com/en/copilot/how-tos/copilot-on-github/set-up-copilot/configure-code-review`
