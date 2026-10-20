# ScanLab: one live synthetic imaging experiment

An imaging researcher compares the effect of controlled motion on a simulated
acquisition, pins a baseline, and retains evidence for a reproducible discussion.
This is a research demonstration, not a diagnostic tool or scanner controller.

## Fixed science, existing libraries

- Analytical 2D geometric phantom: 485 spins, no patient-derived data.
- 33 by 33 reconstruction; 0.23 m field of view.
- KomaMRIBase's built-in EPI sequence and RF excitation, with a fixed delay.
- KomaMRICore CPU Bloch simulation, requested f64 precision; MRIReco's direct
  reconstruction currently yields Float32 magnitude images. Both are recorded.
- T1 = 1 s; T2 = 0.12 s. Arbitrary-unit intensity uses the same fixed [0, 1]
  grayscale in both views. No separate image normalization.
- Presets: `still` (no motion), `gentle` (8 mm x translation), `larger`
  (16 mm x translation). Translation runs during the readout using the library's
  `translate`/`TimeRange` model.

These components and their parameters are pinned in `scanlab/Manifest.toml`
and `src/scanlab/simulation.jl`. Our phantom describes geometry; our code does
not implement a Bloch solver, custom reconstruction, or clinical quality score.
Attribution and technical details are revealed after the audience sees the result.

## Runtime contract

Every Run executes the numerical pipeline. Code warm-up is allowed, but its
results are discarded before the session becomes ready. The initial UI has
no images. Repeated inputs receive a new run ID; there is no saved-result replay.

One session owns one active simulation and one selected preset. Browser and
Canvas share that state. A concurrent start is rejected with HTTP 409.
Unknown/extra input is rejected before mutation. Only three preset identifiers
are accepted: no arbitrary code, URLs, file imports, or scanner parameters.

The state is `idle`, `running`, `succeeded`, or `failed`. The latest completed
result remains identified by its own run ID during a subsequent run or failure.
It is never represented as new output. A failed simulation does not change the
pinned baseline. Errors appear in the UI and local diagnostic output.

The local API requires a run-owned capability and checks browser origins.
The capability is passed to the page in a URL fragment, not a query or upstream
request. Do not include it in screenshots, public URLs or evidence reports.
Loopback and this narrow capability are not production authentication.

## Pin baseline teaching task

The reference supports:

1. Pinning the latest successfully completed run by its exact ID.
2. Holding an immutable copy of its result and parameters through later runs.
3. Synchronized, keyboard-operable zoom with a shared intensity scale.
4. Saving an explicit comparison JSON artifact containing real result metadata.

The ScanLab teaching start leaves the scientific pipeline untouched but returns
an explicit not-implemented response for pinning and disables comparison
controls. Its unchanged pinning tests must fail. The task is to implement the
feature, not weaken its tests or alter the scientific model.

## Boundaries

Only synthetic data; no patient imports, replay, clinical conclusions, new AI
runtime, GPU requirement, database, cloud deployment or unrelated refactors.
Exports are evidence, never an execution fallback. Source and manifests,
parameters, output hashes, actual computation duration and status identify each
result; they do not constitute a regulatory audit trail.

The request desk remains a separate example with unchanged commands and
contracts. GitHub actions remain separately approved.
