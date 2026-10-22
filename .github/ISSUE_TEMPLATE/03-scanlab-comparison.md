---
name: ScanLab reference comparison
about: A bounded HLS workflow improvement, not a scientific-model change
title: "[ScanLab RUN_ID] Keep a reference scan and compare against it"
---

## Run and starting point
Run ID:
Actual committed base branch/SHA from a ScanLab start snapshot:
Human scope and separate remote/agent approval:

## Research workflow
An imaging researcher needs to keep a completed synthetic scan as the reference
(the code calls this pinning a baseline) while running another controlled
motion preset, then see what changed between the two.

## Acceptance
1. Keep a successfully completed result as the reference by run ID, preserving
   image and parameters (`pin_baseline`, `POST /api/pin`).
2. Subsequent runs and failures cannot mutate that reference.
3. Comparison uses a fixed intensity scale and keyboard-operable shared zoom.

## Scope
`src/scanlab/state.jl`, `public/scanlab/app.js`, and directly related tests only.
Do not alter `simulation.jl`, manifests, scanner parameters, or numerical checks.
No new dependencies, patient data, replay mode, publishing or policy changes.

## Validation
Run `npm run scanlab:check`; report actual failures and results.
The retained keep-as-reference assertions are intentionally red in start; do not
weaken them. An app action test is not a human accessibility audit.

## Approval
Creating this issue does not assign Copilot or request review. Each remote action,
assignment, review and cleanup requires separate approval. No auto-merge.
