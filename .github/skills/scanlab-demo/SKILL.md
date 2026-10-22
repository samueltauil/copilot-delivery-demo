---
name: scanlab-demo
description: 'Prepare, run, validate, or explain the local ScanLab synthetic imaging demonstration. Use for ScanLab, live MRI presets, baseline comparisons, and demo readiness.'
user-invocable: true
---

# ScanLab local workflow

Read `docs/how-it-works.md` and `docs/copilot.md`.
Use the actual selected checkout. Never substitute a remote clone or new
worktree that lacks the uncommitted demonstration.

## Prepare and run

1. Check the actual working directory and existing run state.
2. Only on an approved setup request, run `npm run scanlab:setup`.
3. Run `npm run scanlab` or open the existing `scanlab` canvas. Do not scaffold
   another extension. Startup warms code, including the keep, compare and
   download steps on a throwaway session, then publishes a fresh empty session.
   Julia must run with `--threads=2,1`; the launcher sets it and the service
   refuses to start without it.
4. Choose only `still` (No motion), `gentle` (Controlled shift), or `larger`
   (Larger shift). Every Run invokes live simulation.
5. Keep a completed run as the reference (the page says "Keep as reference"; the
   action and API call it `pin_baseline`), compute another preset, and confirm
   the reference run ID and parameters remain unchanged. The displayed image
   must come from the reopened DICOM file. Inspect measured quantization error,
   the full reference run ID and the file/pixel fingerprints; verify the kept
   bytes/pixels remain unchanged.
6. Use linked zoom, pan and brightness/contrast. Download the selected
   acquisition's synthetic Secondary Capture DICOM and save comparison evidence
   if requested. Display controls do not alter pixels. Do not claim a clinical
   MR object, diagnostic quality score, lossless float encoding or conformance
   certification.

## Canvas actions

Use the open Canvas rather than the CLI whenever it is available:

- `get_state`: status, latest scan, kept reference, what changed, activity and
  DICOM evidence (image arrays and file bytes are omitted).
- `select_preset`: one of `still`, `gentle`, `larger`.
- `run_experiment`: compute a new live scan. `waitForResult` waits (about 90
  seconds at most) and returns the summary. A concurrent start is rejected.
- `pin_baseline`: keep the named completed run (by run ID) as the reference.
- `get_comparison`: latest scan and reference with parameters, provenance,
  change measurements and activity.
- `get_pr_note`: Markdown evidence for a pull request (movement, run IDs,
  fingerprints, what changed, saved-file check, who did what). Practice data
  only; make no medical claims. Paste it under the pull request template's
  **Validation → UI/API evidence**.

The page's **Recent activity** shows Canvas actions as Copilot's and bridge
calls as a script's. The label is self-reported display text, not security.

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

The readiness task in `docs/copilot.md#readiness-task` is the manually triggered local automation.
No schedules, cloud automation, global permission changes, commits, pushes,
issues, PRs, reviews, deployment or hosted cleanup are authorized by this skill.

## Explain

Lead with the synthetic imaging comparison in plain words: take a scan, keep it
as the reference, scan again with movement, see what changed. Reveal Copilot's
bounded implementation, tests, and evidence next. Introduce Julia/KomaMRI only
after the result is understood. Never imply clinical validity, patient data, a
quality score, or a reimplemented scientific solver.
