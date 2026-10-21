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

In GitHub Copilot app use **New session -> Workspace -> Current checkout**.
The **Environment: This computer** choice alone does not select the checkout:
**New worktree** starts from committed Git history and omits uncommitted files.
Ask to open the existing `scanlab` canvas, not create a new one.
See [app instructions](harnesses/copilot-app.md).

## Show, then explain

### 1. The question

Show the experiment, not code.

**Say:** "We can generate an image. But can we prove which computation produced
it, and that our imaging software preserved it?"

Run **No motion**. Show the real pipeline state, then the **Integrity** inspector.
The displayed image has been written as DICOM and reopened, not just rendered
from the original array. Stored pixels survive exactly; floating-point
quantization has a measured half-step bound. Show that distinction explicitly.
Pin it, then run **Controlled shift**. Point to the unchanged baseline run ID,
image, and DICOM file hash beside the newly identified current acquisition.
These are live synthetic calculations, not patient images or a recommendation.

### 2. The researcher’s workflow

Use linked zoom, pan and window/level. Reset the view, switch the inspector to
**Pinned baseline**, open **DICOM tags**, and download its actual `.dcm` file.
Save the comparison JSON, which contains both images, encoded DICOM and provenance.

**Say:** "We can inspect the difference without losing our reference or the
parameters that produced it."

Do not call the presets safe/unsafe, diagnostic/non-diagnostic, or optimized.
There is no clinical quality score.

### 3. Reveal Copilot

Show the existing Canvas beside the conversation.

**Say:** "The interesting part is how we turn a specialist scientific capability
into a usable, reviewable workflow. Here is one small improvement we can ask for."

For a live implementation, use a fresh ScanLab **start** snapshot, not the
completed reference you just showed. Label the switch explicitly.

```text
Plan Pin baseline and synchronized comparison for ScanLab.
Pin a completed result by run ID. Preserve an immutable baseline through
subsequent runs and failures. Use the same intensity scale and accessible
controls. Preserve all scientific calculations and parameters.
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

Open **What is computed, and what is proved?** only now.

**Say:** "The numerical pipeline reuses JuliaHealth's KomaMRI and MRIReco.
We did not ask Copilot to invent MRI physics or a DICOM codec. DICOM.jl writes
and reads the file; an independent test parser checks the exported bytes.
Julia is the scientific technology choice; Copilot helps connect that capability
to the workflow and its evidence."

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
output when applicable. A manual **ScanLab local readiness** task is the useful
automation: it runs the gate and summarizes evidence without editing or repairing.
Do not turn the demo into an autonomous clinical agent or a tour of settings.

## Copilot-app-first opening prompt

After completing setup and warming the service outside the presentation:

```text
Use the scanlab-demo skill in the current checkout.
Report the working directory and open the existing ScanLab Canvas.
Do not scaffold a second extension, edit files, install anything, or change settings.
Explain only how to run No motion, pin the reopened DICOM baseline, run
Controlled shift, and inspect the unchanged reference run ID and file hash.
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
and tests. Start intentionally lacks pinning; `npm run scanlab:test` should
fail that feature while numerical checks pass. Run from the prepared root/cache
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
- **Computation fails:** retain the labeled earlier result, show the failure,
  and do not replace it with a replay.
- **Canvas missing:** verify Current checkout and extension inspection.
- **Computer Use blocks the app itself:** respect the host safety policy.
  Use permitted Canvas actions or a human operating the UI; do not bypass it.
- **App unavailable:** label the browser demonstration as browser-only.
- **Review finds nothing:** report it. Deterministic tests remain the evidence.
