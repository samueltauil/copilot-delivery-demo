# Approved local repurposing and the live teaching scope

## ScanLab expansion

### Approved DICOM workbench implementation

The owner approved the Image Integrity Workbench plan and instructed
implementation to begin. Keep the fixed live simulation and add a synthetic
DICOM write/read round trip, decoded-image comparison, linked display controls,
inspectable metadata and fidelity evidence, and a Copilot-app-first rehearsal.
Pin baseline remains the bounded ScanLab teaching task. DICOM is an output of
each new computation, never an imported patient image or saved execution input.
An imaging-scoped DICOM library and an independent developer/test parser are
permitted. Do not add a PACS, arbitrary uploads, clinical algorithms, deployment,
or hosted automation. Actual app GUI evidence remains a separate readiness gate.

The owner approved a separate ScanLab experience: live-only CPU imaging with
one synthetic 2D phantom and three motion presets, a shared browser/Copilot app
Canvas interface, Pin baseline as the bounded live coding exercise, and a
manually triggered local readiness automation. Existing request-desk commands,
tests, and checkpoints must remain available.

First verify the numerical pipeline and the actual Canvas host. Reuse KomaMRI
and maintained reconstruction/plotting components; do not reimplement MRI
physics. Smaller phantom/resolution is permitted, but replay, clinical data,
GPU requirements, deployments, and arbitrary scanner inputs are not.
The single phantom is KomaMRI's bundled BrainWeb-derived `brain_phantom2D`.
After the owner found the earlier analytical shape unrealistic, it replaced that shape.
The phantom ships with the pinned library: no external download and no patient record.
Use a separate pinned imaging environment. New dependencies are limited to the
verified imaging/Canvas workflow. Existing remote-action boundaries below
remain unchanged.

The approved detailed implementation plan is retained in the authoring session,
not in the repository. Actual results and limitations belong in the evidence
record; a browser test alone cannot certify the Copilot app.

### Plain-language interface and Copilot-first upgrade

The owner later asked for a higher-quality shared interface for the web page and
the Copilot app Canvas: detail-driven, sleek, plain-language, with GitHub Copilot
as a fundamental part of the experience. This was implemented from that request
under the shared browser/Canvas scope above; there was no separate plan-approval
step for it. It adds no data, dependencies, hosted actions or scientific change.
The page calls pinning "Keep as reference"; the API, Canvas actions and code
still call it pin baseline, and it remains the bounded live coding exercise.

The owner requested a simple, storytelling-based Julia/JuliaHealth HLS
demonstration, with existing projects reused instead of recreated. After review
and a proposed plan, the owner explicitly instructed implementation to begin.
This covers the local migration and isolated setup, not hosted execution.

## Authoring migration

- Use the registered HealthSampleData/Eunomia and OMOPCDMCohortCreator workflow.
  Verify real package APIs, checksums and aggregate results before wiring the UI.
- Replace the Node application backend with Julia, preserving the name contract,
  accessible correction and transport behavior. Keep Node only for existing
  browser/developer tooling.
- Show one aggregate-only synthetic study context. No new clinical rules,
  data sources, cohort engine, authentication or deployment.
- Update the directly related tests, presenter material, local fixtures and
  GitHub templates. Prepare a least-privilege CI definition locally.
- Preserve legacy checkpoints and historical evidence; do not claim new hosted
  results or interactive human rehearsals.

## Audience implementation scope

In a freshly prepared Julia start snapshot, implement **only** the name rule in
[scenario.md](scenario.md): Julia request validation, accessible browser
feedback, and directly related tests. Keep the study/data setup unchanged.

Primary files: `src/requests.jl`, `public/app.js`, `public/index.html`.
Evidence: `test/requests.jl`, `test/server.jl`,
`e2e/request-submission.spec.js`. Run `npm run check`; retain the existing
assertions, including the ones deliberately failing in the start snapshot.

No unrelated refactors/dependencies during the live task. No pushes, issues,
PRs, assignments, review requests, workflow runs, policy changes, merges or
hosted cleanup without separate explicit approval. Local preparation is not
permission for remote action.
