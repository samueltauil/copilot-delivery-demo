---
name: Isolated PR review exercise
about: Track manual or automatic PR review of an intentional demo-only regression
title: "[demo RUN_ID] Review whitespace regression"
---

## Run and starting point
Run ID: RUN_ID
Scenario: w2 manual / w3 automatic
Base branch/SHA: RECORD_COMMITTED_JULIA_REFERENCE
Head branch and review PR: NOT_CREATED

## Exercise
Apply only the review-whitespace-regression fixture in an isolated worktree.
The intentional regression admits whitespace-only names through the API.
The completed application and canonical checkpoints must stay unchanged.

## Acceptance
1. Unmodified validation tests expose the intentional regression.
2. Record the actual review request/trigger and output, including missed defects.
3. Approved correction restores passing checks; human evaluates the result.

## Validation
`npm test` (Julia name/whitespace assertions must fail with the fixture)
then `npm run check` after correction. Never weaken or skip the failing test.

## Approval
This tracking issue does not trigger code review. Obtain separate remote and
review approval, then use PR Reviewers for w2 or approved native rules for w3.
No guaranteed Copilot finding; no auto-merge or canonical-branch merge.
Cleanup only specifically approved run-owned resources.
