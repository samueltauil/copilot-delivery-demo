---
name: ScanLab baseline comparison
about: A bounded HLS workflow improvement, not a scientific-model change
title: "[ScanLab RUN_ID] Pin baseline and synchronize comparison"
---

## Run and starting point
Run ID:
Actual committed base branch/SHA from a ScanLab start snapshot:
Human scope and separate remote/agent approval:

## Research workflow
An imaging researcher needs to keep a completed synthetic acquisition as a
baseline while running another controlled motion preset.

## Acceptance
1. Pin a successfully completed result by run ID, preserving image and parameters.
2. Subsequent runs and failures cannot mutate that pinned baseline.
3. Comparison uses a fixed intensity scale and keyboard-operable shared zoom.

## Scope
`src/scanlab/state.jl`, `public/scanlab/app.js`, and directly related tests only.
Do not alter `simulation.jl`, manifests, scanner parameters, or numerical checks.
No new dependencies, patient data, replay mode, publishing or policy changes.

## Validation
Run `npm run scanlab:check`; report actual failures and results.
The retained pinning assertions are intentionally red in start; do not weaken them.
An app action test is not a human accessibility audit.

## Approval
Creating this issue does not assign Copilot or request review. Each remote action,
assignment, review and cleanup requires separate approval. No auto-merge.
