# ScanLab: one live synthetic imaging experiment

## Image Integrity Workbench

Each successful acquisition is written as a DICOM Part 10 **Secondary Capture
Image Storage** object (not a clinical MR acquisition). It uses Explicit VR
Little Endian, `OT` modality, `SYN` conversion type, an explicitly synthetic
subject, and unsigned 16-bit MONOCHROME2 pixels. The library writes file-meta
group length and matching file/dataset instance identifiers. A process-local
synthetic study groups acquisitions; every run gets new series and instance UIDs.
No patient orientation, patient-space pixel spacing or fabricated scanner
metadata is asserted. The 96 by 96 image is not upsampled to imply more detail.

DICOM.jl 0.11.0 writes and reopens the actual bytes. The UI displays **decoded
pixels rescaled to arbitrary units**, not the pre-export reconstruction. Encoding
uses a recorded slope derived from `max(1, maximum(image)) / 65535`; it does
not independently normalize either viewport. Default shared display range stays
[0, 1]. Quantization is not lossless floating-point storage: maximum absolute
error must not exceed half the stored intensity step (plus floating-point
roundoff). Stored integer pixels, dimensions, orientation and required identifiers
must survive the round trip exactly. Any failure rejects the new result.

File SHA-256, decoded-pixel SHA-256, original reconstruction hash, run ID, source
and manifest hashes, measured error and timing accompany each result. File
hashes differ across newly identified instances even when decoded pixels match.
The independent `dicom-parser` developer dependency verifies downloaded output,
row-major pixel order, identifiers, transfer syntax and rescaling in browser
tests. This is bounded interoperability evidence, not DICOM conformance
certification or clinical validation.

The protected `GET /api/dicom/{runId}` returns only the current or pinned run's
actual file. Unknown runs are rejected; file paths and uploads are not accepted.
Comparison JSON includes synthetic pixels, DICOM bytes (base64) and evidence;
no capability token is exported. Both results reset with the session.

The workbench is one plain-language page in four steps: take a scan, keep it as
the reference, scan again with movement, see what changed. It compares the two
scans side by side, as a slider, or as a difference map, with linked
zoom/pan/brightness/contrast, a closed **Technical details** area (fingerprints,
DICOM tags, how the scan was made), and explicit download/error states. Display
adjustments do not change stored pixels or the reference evidence. The stage
chips come from stages the server actually reports (`simulating`, `writing`,
`reopening`, `verifying`), not a timed animation; a brief stage can finish
between polling ticks. A **Work with Copilot** card offers copyable prompts,
a draft pull request note and a live activity list. The same page runs in a
browser and in the GitHub Copilot app Canvas.

An imaging researcher compares the effect of controlled motion on a simulated
acquisition, keeps a reference scan, and retains evidence for a reproducible
discussion. This is a research demonstration, not a diagnostic tool or scanner
controller.

## Fixed science, existing libraries

- KomaMRI's bundled `brain_phantom2D` (axial): a digital brain phantom derived
  from the BrainWeb anatomical model (McGill MNI), subsampled to 1.5 mm, giving
  11,554 spins. It is a published synthetic phantom, not a patient record.
- 96 by 96 reconstruction; 0.23 m field of view. The reconstruction grid is
  rotated 90° so anterior is at the top; no DICOM orientation tag is asserted.
- KomaMRIBase's built-in EPI sequence and RF excitation, with a fixed delay.
- KomaMRICore CPU Bloch simulation, requested f64 precision; MRIReco's direct
  reconstruction currently yields Float32 magnitude images. Both are recorded.
- KomaMRI's default BrainWeb tissue ρ/T1/T2/T2* values (CSF, gray and white
  matter). Magnitudes are divided by a fixed constant (3.0) so both views share
  one [0, 1] grayscale. No per-image normalization, so motion-related signal
  loss stays visible.
- Presets: `still` (no motion), `gentle` (8 mm left-right translation), `larger`
  (16 mm left-right translation). Translation runs during the single-shot EPI readout using the library's
  `translate`/`TimeRange` model, producing realistic ghosting and blur.

These components and their parameters are pinned in `scanlab/Manifest.toml`
and `src/scanlab/simulation.jl`. The phantom comes from KomaMRI; our code does
not implement a Bloch solver, custom reconstruction, or clinical quality score.
Attribution and technical details are revealed after the audience sees the result.

## Runtime contract

Every Run executes the numerical pipeline. Code warm-up is allowed, but its
results are discarded before the session becomes ready. Beyond the scan itself,
the warm-up takes the real keep, compare and download steps through the actual
HTTP handlers on a private throwaway session, so the audience's first click is
not a cold start. The initial UI has no images. Repeated inputs receive a new
run ID; there is no saved-result replay.

One session owns one active simulation and one selected preset. Browser and
Canvas share that state. A concurrent start is rejected with HTTP 409.
Unknown/extra input is rejected before mutation. Only three preset identifiers
are accepted: no arbitrary code, URLs, file imports, or scanner parameters.

The state is `idle`, `running`, `succeeded`, or `failed`, with a `stage`
(`simulating`, `writing`, `reopening`, `verifying`, `complete` or `failed`).
The latest completed result remains identified by its own run ID during a
subsequent run or failure. It is never represented as new output. A failed
simulation does not change the kept reference. Errors appear in the UI and
local diagnostic output.

`GET /api/state` returns the full snapshot (`workflowVersion` `dicom-v2`);
`GET /api/status` is a small snapshot the page polls, and it refetches the full
state only when the result or reference changes. A snapshot includes `changes`,
measured on the server from the two pixel arrays (changed-pixel share, mean and
maximum change; a pixel counts as changed above 0.05 of the brightness range),
and a bounded `activity` list. Each activity entry names an actor: `you`,
`copilot` or `script`. The caller reports the actor in the `x-scanlab-actor`
header (absent means `script`), so it is display attribution, not
authentication or an audit trail.

The service must run on Julia started with `--threads=2,1`: the web server owns
the interactive thread and scans run on the worker threads, so every request is
answered while a scan computes. `npm run scanlab` and the browser-test launcher
set this, and the service refuses to start without it.

The local API requires a run-owned capability and checks browser origins.
The capability is passed to the page in a URL fragment, not a query or upstream
request. Do not include it in screenshots, public URLs or evidence reports.
Loopback and this narrow capability are not production authentication.

## Keep as reference (pin baseline) teaching task

The reference supports:

1. Keeping the latest successfully completed run, by its exact ID, as the
   reference. The page says "Keep as reference"; the API and code call it
   pinning a baseline (`POST /api/pin`, `pin_baseline`).
2. Holding an immutable copy of its result and parameters through later runs and
   failures.
3. Measuring what changed against a newer scan and showing it three ways, with
   synchronized, keyboard-operable zoom and a shared intensity scale.
4. Saving an explicit comparison JSON artifact containing real result metadata.

The ScanLab teaching start leaves the scientific pipeline untouched but returns
an explicit not-implemented response (HTTP 501) for keeping a reference and
disables the keep button and view controls. Its unchanged tests must fail. The
task is to implement the feature, not weaken its tests or alter the scientific
model.

## Boundaries

Only synthetic data; no patient imports, replay, clinical conclusions, new AI
runtime, GPU requirement, database, cloud deployment or unrelated refactors.
Exports are evidence, never an execution fallback. Source and manifests,
parameters, output hashes, actual computation duration and status identify each
result; they do not constitute a regulatory audit trail.

The request desk remains a separate example with unchanged commands and
contracts. GitHub actions remain separately approved.
