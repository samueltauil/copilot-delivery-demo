# ScanLab: let the result create the conversation

## Before the audience joins

From the actual local checkout:

```powershell
npm run scanlab:setup
npm run scanlab:check
npm run scanlab
```

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

**Say:** "Same virtual object. One acquisition condition changed. What happens
to the resulting image?"

Run **No motion**, pin it, then run **Controlled shift** and **Larger shift**.
Point to the fixed baseline, shared scale and actual run metadata. These are
live synthetic calculations, not patient images or a clinical recommendation.

### 2. The researcher’s workflow

Use the keyboard-accessible shared zoom and save a comparison.

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

Open **How this experiment works** only now.

**Say:** "The numerical pipeline reuses JuliaHealth's KomaMRI and MRIReco.
We did not ask Copilot to invent MRI physics. Julia is the scientific technology
choice; Copilot helps connect that capability to the workflow and its evidence."

Close with the saved comparison and a discussion of the audience's specialist
workflows. Do not turn the close into a tour of every package or Copilot setting.

## Optional GitHub continuation

Reuse this exact task: issue -> implementation branch -> PR -> checks -> human
review. Local templates and CI definitions are preparation, not hosted results.
Obtain separate approval before publication, assignments, reviews or workflow
runs. Do not switch to the generic requester-name story halfway through.

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
