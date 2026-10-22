# ScanLab: image integrity, from Copilot to DICOM

## Before the audience joins

From the actual local checkout:

```powershell
npm run scanlab:setup
npm run scanlab:check
npm run scanlab
```

Also run `npm run setup` before presenting the preserved request-desk exercise.
Do not install dependencies or compile packages in front of the audience.

Wait for **ScanLab ready**, then open the printed local URL. Keep that terminal
open. Compilation belongs here, not in front of the audience. The canvas can
attach to that same prepared session; do not run checks inside the presentation
session or switch to another worktree unintentionally.

The first start takes about three minutes. Before it prints the URL, ScanLab
rehearses the first scan, keep and compare steps on a throwaway session and
discards that result, so the first click in front of the audience answers in
well under a second instead of stalling on a cold start. The launcher starts
Julia with `--threads=2,1`: one thread keeps the page answering while the others
compute a scan. Start the service with `npm run scanlab`; it stops with a clear
message if Julia was started with fewer threads.

In GitHub Copilot app use **New session -> Workspace -> Current checkout**.
The **Environment: This computer** choice alone does not select the checkout:
**New worktree** starts from committed Git history and omits uncommitted files.
Ask to open the existing `scanlab` canvas, not create a new one.
See [app instructions](harnesses/copilot-app.md).

## What the audience sees

One screen, four steps, in plain words:

1. **Take a scan.** A practice MRI scan is simulated on this computer.
2. **Keep it as your reference.** That scan is frozen so nothing can change it.
3. **Scan again with movement.** The same synthetic head moves a little.
4. **See what changed.** Side by side, as a slider, or as a map of what moved.

The same page runs in a browser and inside the GitHub Copilot app Canvas. Copilot
works on the same running service through Canvas actions, so what it does appears
on the page you are showing.

## Show, then explain

### 1. The question

Show the experiment, not code.

**Say:** "We can generate an image. But can we prove which computation produced
it, and that our imaging software preserved it?"

- Choose **No motion** and press **Take scan**. The four chips under the button
  (**Simulate the scan**, **Save as DICOM file**, **Open the file again**,
  **Check every pixel**) light up as that work really happens.
- The picture on screen was read back from the saved DICOM file, not just drawn
  from the original array. The **File check** card says **Saved file checks
  out**: the stored pixels match exactly (they do), and it states the measured
  rounding bound that storing floating-point values requires. Show that
  distinction explicitly.
- Press **Keep as reference**, choose **Controlled shift** and press
  **Scan again**. The view opens on **What changed**. Read the three plain
  sentences (**Picture changed**, **Average change**, **Biggest change**), then
  switch to **Side by side** and **Slide**.
- The reference keeps its run ID, picture and file fingerprint. The new scan has
  its own run ID.

These are live synthetic calculations, not patient images or a recommendation.

### 2. The researcher’s workflow

Zoom, pan, brightness and contrast move both pictures together. With the image
focused, arrow keys pan, `=` and `-` zoom, and `0` resets. **Download DICOM file**
saves the actual `.dcm` file. **Save comparison** saves JSON with both images,
the encoded DICOM and provenance. Open **Technical details** (closed by default)
only if someone asks: **Fingerprints**, **DICOM tags**, **How it was made**.

**Say:** "We can inspect the difference without losing our reference or the
parameters that produced it."

Do not call the presets safe/unsafe, diagnostic/non-diagnostic, or optimized.
There is no clinical quality score.

### 3. Reveal Copilot

Show the existing Canvas beside the conversation. The **Work with Copilot** card
is the connection:

- **Suggested prompts** follow the step you are on. Each has a copy button. All
  begin "Use the ScanLab canvas to …", so Copilot uses the open Canvas instead of
  scaffolding another one.
- **Recent activity** lists every action in plain words as it happens: "You
  chose …", "Copilot kept … as the reference", "A script started a scan". The
  names are self-reported display labels for the demo; they are not security or
  an audit trail.
- **Copy pull request note** (the Canvas action `get_pr_note`) drafts a pull
  request note from the real run: movement, full run IDs, file and pixel
  fingerprints (SHA-256), what changed, the saved-file check and who did what.
  Paste it under **Validation → UI/API evidence** in the pull request template.
  It is evidence text, not a replacement for the exact commands and results the
  template asks for.

**Moment A: Copilot drives.** Copy **Run the whole comparison**, paste it into
Copilot, and watch the page move on its own:

```text
Use the ScanLab canvas to run No motion, keep it as the reference, run Controlled shift, then explain in plain words what changed. Quote the real run IDs and numbers.
```

Copilot calls `select_preset`, `run_experiment` (with `waitForResult`),
`pin_baseline` and `get_comparison`. The step strip advances and each action
appears as "Copilot …". Then copy **Write the pull request note**.

**Moment B: Copilot builds.** For a live implementation, use a fresh ScanLab
**start** snapshot, not the completed reference you just showed. Label the
switch explicitly. The start has no **Keep as reference** (the code calls it pin
baseline): the button and the view controls are disabled and the server answers
501.

```text
Plan the "Keep as reference" feature (the code calls it pin baseline) and the
comparison it unlocks for ScanLab.
Keep a completed result by run ID. Preserve that reference through subsequent
runs and failures. Use the same intensity scale and accessible controls.
Preserve all scientific calculations and parameters.
No new dependencies or unrelated refactors. Keep the existing tests.
Do not implement until I approve the bounded plan.
```

Review the plan and permissions. Then approve the implementation.

### 4. Verify what changed

```text
Inspect the actual diff against the approved comparison feature.
Run npm run scanlab:check. Report exact results, including failures.
Do not change the simulator, weaken tests, or claim an unexecuted app check.
```

Show one meaningful diff, the pinning assertion, and the actual updated canvas.
Agent output, fixture correction and the reference are distinct evidence.

### 5. Reveal the technology

Open **Technical details** only now.

**Say:** "The numerical pipeline reuses JuliaHealth's KomaMRI and MRIReco.
We did not ask Copilot to invent MRI physics or a DICOM codec. DICOM.jl writes
and reads the file; an independent test parser checks the exported bytes.
Julia is the scientific technology choice; Copilot helps connect that capability
to the workflow and its evidence."

The page uses plain words on purpose. If someone asks for the precise term:

| On the page | Underneath |
|---|---|
| Take scan, Scan again | A live KomaMRI acquisition reconstructed with MRIReco (`POST /api/run`). Nothing is replayed. |
| Save as DICOM file | DICOM.jl writes the image as a DICOM file. |
| Open the file again | The file is read back and its pixel data decoded. |
| Check every pixel | The decoded pixels are compared with the stored pixel array. Integers must match exactly; floating-point values carry a measured half-step rounding bound. |
| Keep as reference | Pin baseline: the Canvas action `pin_baseline`, `POST /api/pin`. |
| What changed | A per-pixel difference between the two images (`changes` in the API). A pixel counts as changed when it moves by more than 0.05 of the brightness range. |
| Picture changed, Average change, Biggest change | `changedPixelsPercent`, `meanChangePercent`, `maxChangePercent`. |
| Fingerprint | A SHA-256 hash of the file or of the decoded pixels. |
| Run ID | The UUID of one computation. |
| Recent activity | The activity list. The actor (`you`, `copilot`, `script`) is reported by the caller. |

Close with the saved comparison and a discussion of the audience's specialist
workflows. Do not turn the close into a tour of every package or Copilot setting.

## Optional GitHub continuation

Reuse this exact task: issue -> implementation branch -> PR -> checks -> human
review. Local templates and CI definitions are preparation, not hosted results.
Obtain separate approval before publication, assignments, reviews or workflow
runs. Do not switch to the generic requester-name story halfway through.

Highlight repository instructions and the `scanlab-demo` skill first: they
carry the scientific/data boundaries and exact validation commands. Then show a
plan, human approval, the actual diff, unchanged acceptance tests, and failure
output when applicable. The ScanLab pull request note belongs under the
template's **Validation → UI/API evidence**. A manual **ScanLab local readiness**
task is the useful
automation: it runs the gate and summarizes evidence without editing or repairing.
Do not turn the demo into an autonomous clinical agent or a tour of settings.

## Copilot-app-first opening prompt

After completing setup and warming the service outside the presentation:

```text
Use the scanlab-demo skill in the current checkout.
Report the working directory and open the existing ScanLab Canvas.
Do not scaffold a second extension, edit files, install anything, or change settings.
Explain only how to take a No motion scan, keep the reopened DICOM as the
reference, run Controlled shift, and compare against the unchanged reference
run ID and file fingerprint.
```

The host may prohibit Computer Use on Copilot itself. If so, a human operates the
Canvas and records that observation. Browser, adapter and actual app evidence
are separate. After source changes, restart only the service you own; an attached
older service is not automatically replaced. Never publish capability-bearing URLs.

## Repeat

```powershell
npm run demo:local -- --run scanlab-one --exercise scanlab
```

The copied `start` and `reference` directories preserve all scientific source
and tests. Start intentionally lacks **Keep as reference** (pinning): the keep
button and view controls are disabled, the server answers 501, and
`npm run scanlab:test` fails that feature (and the browser checks that depend
on it) while the numerical checks pass. Run from the prepared root/cache
location so Julia and plotting artifacts can be found without copying caches.

For a deterministic fixture rehearsal in untouched start:

```powershell
$env:GIT_CEILING_DIRECTORIES = Split-Path $PWD.Path
git apply --no-index --ignore-space-change --check --reverse docs\fixtures\scanlab-start.patch
git apply --no-index --ignore-space-change --reverse docs\fixtures\scanlab-start.patch
npm run scanlab:check
```

This is fixture evidence, not a claim that Copilot implemented the change.
Do not apply it over an agent's partial edits.

## Failure cards

- **Not ready:** read the real error; finish setup before presenting.
- **Slow first click, or a page that freezes during a scan:** you are attached
  to an older service that predates the startup rehearsal and the thread layout.
  Close every ScanLab panel, restart with `npm run scanlab`, and wait for
  **ScanLab ready**.
- **Computation fails:** retain the labeled earlier result, show the failure,
  and do not replace it with a replay.
- **Canvas missing:** verify Current checkout and extension inspection.
- **Computer Use blocks the app itself:** respect the host safety policy.
  Use permitted Canvas actions or a human operating the UI; do not bypass it.
- **App unavailable:** label the browser demonstration as browser-only.
- **Review finds nothing:** report it. Deterministic tests remain the evidence.
