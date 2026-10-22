# Presenting ScanLab

A step-by-step script for showing ScanLab and GitHub Copilot together. Rehearse
it once on your own machine first. A warm scan took about 20 seconds on the
measured development machine; allow extra time on slower CPUs.

## Before the audience joins

Do all of this ahead of time. Never install or compile in front of the audience.

1. Install Julia 1.10.12 and Node 22.20 or newer.
2. From the checkout, run `npm ci`, `npx playwright install chromium` and
   `npm run scanlab:setup`.
3. Recommended: run `npm run scanlab:check`.
4. Run `npm run scanlab` and wait for `ScanLab ready: <url>`. Keep that terminal
   open. The first start takes about three minutes.
5. Open the URL in a browser, or open the Canvas in the GitHub Copilot app (see
   [Open ScanLab in the GitHub Copilot app](copilot.md#open-scanlab-in-the-github-copilot-app)).
6. Check the Copilot mode, tool permissions and account access you will use. A
   prompt that says "do not edit" does not make a session read-only.

Present from the same checkout and the same running service. Do not run checks
inside the presentation session, and do not switch to another worktree by
accident.

## The demo

### 1. Show the question

**Say:** "We can generate an image. But can we prove which computation produced
it, and that our imaging software preserved it?"

Choose **No motion** and press **Take scan**. Four chips light up as the work
really happens: **Simulate the scan**, **Save as DICOM file**, **Open the file
again** and **Check every pixel**.

Point out two things:

- The picture was read back from the saved DICOM file, not just drawn from the
  original numbers.
- The **File check** card says **Saved file checks out**. The stored pixels match
  exactly, and the rounding from decimals to whole numbers is measured and
  bounded.

### 2. Compare

Press **Keep as reference**, choose **Controlled shift** and press **Scan
again**. The view opens on **What changed**. Read the three sentences (**Picture
changed**, **Average change**, **Biggest change**), then switch to **Side by
side** and **Slide**.

The reference keeps its run ID, picture and file fingerprint. The new scan has
its own run ID.

These are live practice calculations, not patient images. Do not call the
presets safe, unsafe, diagnostic or optimized. There is no quality score.

### 3. Work like a researcher

Zoom, pan, brightness and contrast move both pictures together. With the image
focused, the arrow keys pan, `=` and `-` zoom, and `0` resets. **Download DICOM
file** saves the real file. **Save comparison** saves a JSON file with both
images and the evidence. Open **Technical details** (closed by default) only if
someone asks.

**Say:** "We can inspect the difference without losing the reference or the
settings that produced it."

### 4. Let Copilot drive

The **Work with Copilot** card connects the page to Copilot:

- **Suggested prompts** follow the step you are on. Each has a copy button, and
  each starts with "Use the ScanLab canvas to ...", so Copilot uses the open
  Canvas instead of building another one.
- **Recent activity** lists every action in plain words as it happens, such as
  "You chose ...", "Copilot kept ... as the reference" or "A script started a
  scan". The names are display labels, not security.

Copy **Run the whole comparison**, paste it into Copilot, and watch the page
move on its own:

```text
Use the ScanLab canvas to run No motion, keep it as the reference, run Controlled shift, then explain in plain words what changed. Quote the real run IDs and numbers.
```

Copilot calls `select_preset`, `run_experiment`, `pin_baseline` and
`get_comparison`. The step strip advances and each action appears as Copilot's.

### 5. Let Copilot write the evidence

Copy **Write the pull request note**. Copilot calls `get_pr_note` and tidies the
result into a short description: the movement, full run IDs, file and pixel
fingerprints, what changed, the saved-file check and who did what. **Copy pull
request note** on the page does the same without Copilot.

Paste the note under **Validation → UI/API evidence** in the pull request
template. It is evidence text. The template still asks for the exact commands
and results.

### 6. Optional: let Copilot build a feature

For a live build, use a fresh **start** snapshot, not the finished app you just
showed (see [Repeat the exercise](#repeat-the-exercise)). Say clearly that you
switched. The start has no **Keep as reference**: the button and view controls
are disabled and the server answers HTTP 501.

```text
Plan the "Keep as reference" feature (the code calls it pin baseline) and the
comparison it unlocks for ScanLab.
Keep a completed result by run ID. Preserve that reference through subsequent
runs and failures. Use the same intensity scale and accessible controls.
Preserve all scientific calculations and parameters.
No new dependencies or unrelated refactors. Keep the existing tests.
Do not implement until I approve the bounded plan.
```

Review the plan and the permissions, then approve the implementation. Afterward:

```text
Inspect the actual diff against the approved comparison feature.
Run npm run scanlab:check. Report exact results, including failures.
Do not change the simulator, weaken tests, or claim an unexecuted app check.
```

Show one meaningful part of the diff, the test for keeping the reference, and
the updated page. The agent's output, a fixture correction and the finished
reference are three different kinds of evidence. Keep them apart.

### 7. Reveal the technology

Open **Technical details** only now.

**Say:** "The numbers come from JuliaHealth's KomaMRI and MRIReco. We did not ask
Copilot to invent MRI physics or a DICOM writer. DICOM.jl writes and reads the
file, and an independent parser checks the bytes. Julia is the scientific
choice. Copilot connects that capability to the workflow and its evidence."

Use the table in [How ScanLab works](how-it-works.md#words-on-the-page-and-what-they-mean)
if someone asks for the precise term. Close with the saved comparison and a
conversation about the audience's own workflows. Do not tour every package or
Copilot setting.

## Opening prompt for the Copilot app

After setup, with the service already running:

```text
Use the scanlab-demo skill in the current checkout.
Report the working directory and open the existing ScanLab Canvas.
Do not scaffold a second extension, edit files, install anything, or change settings.
Explain only how to take a No motion scan, keep the reopened DICOM as the
reference, run Controlled shift, and compare against the unchanged reference
run ID and file fingerprint.
```

## Repeat the exercise

This copies fresh **start** and **reference** folders, so you can rehearse the
build as often as you like without touching your working files:

```powershell
$env:JULIA_DEPOT_PATH = Join-Path $PWD.Path '.demo-runs\julia-depot'
npm run demo:local -- --run scanlab-one --exercise scanlab
Set-Location .demo-runs\scanlab-one\start
npm ci
npm run scanlab:check
```

- Use a new run name each time. The command stops if the folder exists.
- Only the source files are copied. Private notes, caches, dependencies and Git
  history are not.
- Setting `JULIA_DEPOT_PATH` lets the copies reuse the packages you already
  installed. If Julia is not on your PATH, also set `JULIA_EXE`.
- In **start**, `npm run scanlab:check` fails on purpose: the keep-as-reference
  tests and the browser checks that depend on it. The numerical checks pass.
  **reference** is the finished version and passes.

To rehearse the finished result without an agent, in an untouched **start** folder:

```powershell
$env:GIT_CEILING_DIRECTORIES = Split-Path $PWD.Path
git apply --no-index --ignore-space-change --check --reverse docs\fixtures\scanlab-start.patch
git apply --no-index --ignore-space-change --reverse docs\fixtures\scanlab-start.patch
npm run scanlab:check
```

This is a fixture, not proof that Copilot built the feature. Never apply it over
an agent's partial edits.

## If something goes wrong

- **Not ready:** read the real error and finish setup before presenting.
- **Slow first click, or a page that freezes during a scan:** you are attached to
  an older service. Close every ScanLab panel, restart with `npm run scanlab`,
  and wait for `ScanLab ready`.
- **A scan fails:** keep the earlier result, labeled as earlier, and show the
  failure. Never replace it with a saved result.
- **Canvas missing:** check that the session uses **Current checkout**, then
  reload extensions once (see the [Copilot guide](copilot.md#open-scanlab-in-the-github-copilot-app)).
- **Computer Use is blocked for the Copilot app:** respect it. Use the Canvas
  actions, or operate the page yourself and say so.
- **The app is unavailable:** present the browser page and label it browser-only.
- **Copilot's review finds nothing:** report that. The tests are the evidence.

## Optional: continue on GitHub

Reuse the same task: issue, branch, pull request, checks, human review. Open with
the repository instructions and the `scanlab-demo` skill, because they carry the
data boundaries and the exact commands. Then show the plan, your approval, the
real diff, the unchanged tests and any failure output.

The local issue templates and the CI definition are preparation, not results from
GitHub. Every hosted action (publishing, assigning Copilot, requesting a review,
running a workflow) needs your separate approval first. See the
[Copilot guide](copilot.md#issue-and-pull-request-templates).
