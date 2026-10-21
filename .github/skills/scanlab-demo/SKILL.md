---
name: scanlab-demo
description: 'Prepare, run, validate, or explain the local ScanLab synthetic imaging demonstration. Use for ScanLab, live MRI presets, baseline comparisons, and demo readiness.'
user-invocable: true
---

# ScanLab local workflow

Read `docs/scanlab-scenario.md` and `docs/harnesses/copilot-app.md`.
Use the actual selected checkout. Never substitute a remote clone or new
worktree that lacks the uncommitted demonstration.

## Prepare and run

1. Check the actual working directory and existing run state.
2. Only on an approved setup request, run `npm run scanlab:setup`.
3. Run `npm run scanlab` or open the existing `scanlab` canvas. Do not scaffold
   another extension. Startup warms code, then publishes a fresh empty session.
4. Choose only `still`, `gentle`, or `larger`. Every Run invokes live simulation.
5. Pin a completed run, compute another preset, and confirm the baseline run ID
   and parameters remain unchanged. The displayed image must come from the
   reopened DICOM file. Inspect measured quantization error, full baseline run ID
   and DICOM/pixel hashes; verify the pinned bytes/pixels remain unchanged.
6. Use linked zoom, pan and window/level. Download the selected acquisition's
   synthetic Secondary Capture DICOM and save comparison evidence if requested.
   Display controls do not alter pixels. Do not claim a clinical MR object,
   diagnostic quality score, lossless float encoding or conformance certification.

When native Canvas actions are unavailable in CLI, use
`npm run scanlab:control -- state`, `run still|gentle|larger`, or `pin RUN_ID`
against an already-ready session. Do not use CLI to bypass Computer Use
restrictions on a protected desktop app.

## Validate or automate readiness

Run `npm run scanlab:check`. Report the actual exit status and failing checks.
Run `npm run check` when a shared component changed. Do not edit or fix files,
upgrade packages, install missing dependencies, weaken tests, or fabricate a
successful report during a readiness automation. A failed prerequisite is a
failed readiness result.

Use `docs/scanlab-readiness.md` for the manually triggered local automation.
No schedules, cloud automation, global permission changes, commits, pushes,
issues, PRs, reviews, deployment or hosted cleanup are authorized by this skill.

## Explain

Lead with the synthetic imaging comparison. Reveal Copilot's bounded
implementation, tests, and evidence next. Introduce Julia/KomaMRI only after
the result is understood. Never imply clinical validity, patient data, a quality
score, or a reimplemented scientific solver.
