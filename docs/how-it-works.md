# How ScanLab works

ScanLab is a practice MRI scanner that runs on your own computer. It scans a
fixed, synthetic brain, saves the result as a medical-image file, opens the file
again to check it, and shows what changes when the head moves.

No patient data is involved, and it is not a medical tool.

## The four steps

1. **Take a scan.** A practice scan is simulated on this computer.
2. **Keep it as your reference.** That scan is frozen. Nothing can change it.
3. **Scan again with movement.** The same head moves a little during the scan.
4. **See what changed.** Look side by side, drag a slider, or view a map of the
   difference.

You choose one of three movements:

| On the page | Movement | Preset ID |
|---|---|---|
| No motion | None | `still` |
| Controlled shift | 8 mm, left and right | `gentle` |
| Larger shift | 16 mm, left and right | `larger` |

## What happens when you press Take scan

The page shows four stages. They are real: the service reports each one as it
happens.

1. **Simulate the scan.** KomaMRI simulates the scanner and the head. MRIReco
   turns the signal into a 128 × 128 picture.
2. **Save as DICOM file.** DICOM.jl writes the picture as a DICOM file, the
   standard format for medical images.
3. **Open the file again.** The file is read back from its bytes.
4. **Check every pixel.** The pixels read back are compared with the ones that
   were saved.

The picture on screen is the one read back from the file, not the copy that was
in memory. Every scan is computed fresh. Nothing is replayed from a saved
result, and a failed scan never passes an old picture off as new.

## The head and the scanner

ScanLab does not implement MRI physics. It uses libraries that already do
(see [credits](credits.md)).

- **Head:** KomaMRI's bundled `brain_phantom2D`, a slice of the BrainWeb digital
  brain model, sampled at 1.0 mm with 25,971 simulated points. It is a published
  synthetic phantom, not a person.
- **Scanner:** KomaMRI's built-in single-shot EPI sequence, simulated on the CPU
  and reconstructed to 128 × 128 pixels over a 0.23 m field of view.
- **Movement:** the head shifts left and right while the scan is being read out.
  That is what produces the ghosting and blur.
- **Brightness:** every image is divided by the same constant (3.8), so both
  scans share one 0–1 scale. Nothing is normalized per image, so signal lost to
  movement stays visible.

The pinned versions live in `scanlab/Manifest.toml`. The fixed parameters live
in `src/scanlab/simulation.jl`.

## The DICOM file

Each successful scan is written as a DICOM Part 10 Secondary Capture file:
Explicit VR Little Endian, modality `OT`, conversion type `SYN`, an explicitly
synthetic subject, and unsigned 16-bit `MONOCHROME2` pixels.

- Every scan gets new series and instance IDs. One synthetic study groups the
  scans in a session.
- No patient orientation, pixel spacing or scanner details are claimed, and the
  128 × 128 image is never enlarged to look more detailed.
- Storing decimals as 16-bit integers rounds them. The rounding error is
  measured, and it must not exceed half of one stored step. Stored pixels,
  dimensions and identifiers must come back exactly. Any failure rejects the
  new scan.
- Each scan carries fingerprints (SHA-256 of the file and of the decoded pixels),
  its run ID, the measured error and the time it took. File fingerprints differ
  between scans even when the pixels match, because each file has new IDs.
- **Download DICOM file** saves the real file. The browser tests parse those
  bytes with an independent reader, `dicom-parser`.

This is a practice image, not a clinical MR image. No DICOM conformance
certification and no clinical validity is claimed.

## The reference and what changed

**Keep as reference** stores an immutable copy of a finished scan, chosen by its
exact run ID. Later scans and failures cannot change it. The newest scan keeps
its own run ID while another scan runs or fails.

**What changed** is measured on the server from the two sets of pixels:

- **Picture changed:** the share of pixels that moved by more than 0.05 of the
  brightness range.
- **Average change:** the mean change across every pixel.
- **Biggest change:** the change at the single most different pixel.

Zoom, pan, brightness and contrast move both pictures together and never change
the stored pixels. **Save comparison** downloads a JSON file with both images,
the DICOM bytes and the evidence. It contains no access token.

## Words on the page and what they mean

The page uses plain words on purpose. If someone asks for the precise term:

| On the page | Underneath |
|---|---|
| Take scan, Scan again | A live KomaMRI acquisition reconstructed with MRIReco (`POST /api/run`). |
| Save as DICOM file | DICOM.jl writes the image as a DICOM file. |
| Open the file again | The file is read back and its pixel data decoded. |
| Check every pixel | Decoded pixels are compared with the stored ones. Integers must match exactly. |
| Keep as reference | Pin baseline: the Canvas action `pin_baseline`, `POST /api/pin`. |
| What changed | A per-pixel difference (`changes` in the API). |
| Picture changed, Average change, Biggest change | `changedPixelsPercent`, `meanChangePercent`, `maxChangePercent`. |
| Fingerprint | A SHA-256 hash of the file or of the decoded pixels. |
| Run ID | The UUID of one computation. |
| Recent activity | The activity list. The actor is `you`, `copilot` or `script`. |

## The service

A Julia service on `127.0.0.1` serves the page and a small API. The browser and
the Copilot app Canvas use the same page and the same running state.

- **One scan at a time.** Starting a second scan while one runs returns HTTP 409.
  Only the three preset IDs are accepted. There are no uploads, file paths or
  scanner settings to change.
- **Responsive.** Julia starts with `--threads=2,1`, so the web server keeps
  answering while a scan computes on another thread. The launcher sets this, and
  the service refuses to start without it.
- **Warm start.** Starting takes about three minutes the first time. Before it
  prints the URL, the service rehearses a scan, keep, compare and download on a
  throwaway session and discards the result. The first live click is then quick.
  A warm scan took about 20 seconds on the development machine; slower CPUs may
  take longer.
- **Local only.** Every `/api` request needs the session token in an
  `x-scanlab-token` header, and the browser origin is checked. The page receives
  the token in the URL fragment. Do not share that URL or a screenshot of it.
  This is a local guard, not production authentication.
- **Who did it.** The caller may send `x-scanlab-actor` (`you`, `copilot` or
  `script`). It labels entries in **Recent activity**. It is display text, not
  security and not an audit trail.

| Route | Purpose |
|---|---|
| `GET /api/state` | The full snapshot (`workflowVersion` `dicom-v2`) |
| `GET /api/status` | A small snapshot the page polls |
| `POST /api/preset` | Choose a preset: `{"preset": "still"}` |
| `POST /api/run` | Start a scan: `{"preset": "gentle"}`. Answers 202 with the run ID |
| `POST /api/pin` | Keep a finished scan as the reference: `{"runId": "..."}` |
| `GET /api/compare` | The comparison JSON. Answers 409 while a scan is running |
| `GET /api/dicom/{runId}` | The DICOM file of the current or kept scan |

The state is `idle`, `running`, `succeeded` or `failed`. While running, the
stage is `simulating`, `writing`, `reopening` or `verifying`.

## Project layout

```text
src/scanlab/                  Julia service: simulation, DICOM, state, HTTP routes
public/scanlab/               The page (also shown in the Canvas): HTML, CSS, app.js, story.js
.github/extensions/scanlab/   Copilot app extension that opens the page as a Canvas
.github/skills/scanlab-demo/  Copilot skill with the ScanLab rules
scanlab/                      Pinned Julia environment, Julia tests, browser tests
scripts/                      Launchers and helpers
docs/fixtures/                Patches used to rehearse the exercises
```

`story.js` holds the wording and logic that the page and the Canvas share.
The request desk, a separate exercise, lives in `src/`, `public/`, `test/` and
`e2e/` (see [request desk](request-desk.md)).

## Scope and boundaries

In scope:

- A live synthetic scan, DICOM written and reopened, and a comparison against a
  kept reference.
- One page for the browser and the Copilot app Canvas.
- **Keep as reference** as the bounded coding exercise for a live build.
- A manual local readiness task ([Copilot guide](copilot.md#readiness-task)).

Out of scope: patient data or imports, replaying saved results, clinical claims
or quality scores, GPU requirements, a database, deployment, hosted actions and
unrelated refactors. Exports are evidence, never a way to skip the computation.
Run IDs, fingerprints and timings identify a result. They are not a regulatory
audit trail.

Anyone changing ScanLab should reuse the pinned libraries, never replace a
failed library call with a hardcoded result, and keep every test intact.

## The coding exercise

The **start** snapshot leaves the science untouched but has no **Keep as
reference**: the button and the view controls are disabled and the server
answers HTTP 501. Its tests for that feature fail on purpose. The task is to
build the feature, not to weaken the tests or change the scientific model. See
[Presenting ScanLab](presenting.md#repeat-the-exercise) for how to prepare a
snapshot.
