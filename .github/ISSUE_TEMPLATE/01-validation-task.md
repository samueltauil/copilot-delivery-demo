---
name: Request-name validation exercise
about: Draft a bounded implementation task; assignment is a separate human action
title: "[demo RUN_ID] Require requester name"
---

## Run and starting point
Run ID: RUN_ID
Base branch: demo/RUN_ID/base (committed from a fresh Julia start snapshot)
Actual base SHA: RECORD_BEFORE_ASSIGNMENT
Head branch: RECORD_OBSERVED_AGENT_BRANCH

## Business problem
An unnamed synthetic study-review request can currently be submitted. Require requesterName; reject
missing, null, non-string, empty, and whitespace-only values with HTTP 400 and
`Requester name is required.` Create nothing on rejection. Trim valid names.

## Acceptance
1. Invalid name is rejected in the API and shown accessibly in the UI.
2. Valid name returns HTTP 201 and is listed with the trimmed name.
3. Corrected input clears the error and allows submission.

## Scope and exclusions
Julia request store/server, name UI feedback, and tests only. No unrelated
refactors, dependencies, publishing, policies, or merges. Preserve description
behavior and the JuliaHealth study snapshot.

## Validation
`npm test`, `npm run test:e2e`, `npm run check`.
Report exact results and any browser/environment gaps.

## Approval
Draft only. Record human scope approval and separate remote/agent approval.
Do not preassign Copilot. Creating this issue does not request code review.
Confirm the actual base branch/SHA in assignment controls before starting work.
