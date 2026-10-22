# ScanLab and GitHub Copilot

Copilot is part of ScanLab, not an add-on. It can drive the running app, draft the
pull request evidence, and build a feature on top of it. This guide covers each
piece.

## What Copilot does here

| Piece | What it does | Where |
|---|---|---|
| **Work with Copilot** card | Suggested prompts, a draft pull request note and a live list of who did what | The page and the Canvas |
| Canvas actions | Let Copilot take scans, keep the reference and read the comparison | `.github/extensions/scanlab` |
| Repository instructions | The data and safety rules every session follows | `.github/copilot-instructions.md` |
| `scanlab-demo` skill | How to prepare, run and validate ScanLab | `.github/skills/scanlab-demo/SKILL.md` |
| Issue and pull request templates | Bounded tasks and evidence for GitHub work | `.github/ISSUE_TEMPLATE/`, `.github/PULL_REQUEST_TEMPLATE.md` |
| Readiness task | A manual check that runs the tests and reports | [Readiness task](#readiness-task) |

## Open ScanLab in the GitHub Copilot app

1. Add the repository folder, then start a **New session**.
2. Set **Workspace → Current checkout** and confirm the working directory.
   **Environment: This computer** alone does not select the checkout, and **New
   worktree** starts from committed history, so it leaves out uncommitted files.
3. Prepare ScanLab before presenting: run `npm run scanlab:setup` once, then
   `npm run scanlab` and wait for `ScanLab ready`.
4. Ask: `Open the existing scanlab canvas. Do not scaffold or edit anything.`
5. If the extension is missing, use `extensions_reload` once and read the real
   error for `scanlab`. Do not start more sessions to retry.
6. Ask Copilot to drive it, or copy a suggested prompt from the card.

The extension uses the app's own `@github/copilot-sdk/extension`, so no AI SDK
install and no secret is needed. It starts the service only when the Canvas opens
or an action asks for it. If the Canvas attaches to a service you started in a
terminal, closing the Canvas leaves that service running. If the Canvas started
the service, closing the Canvas stops only that service.

A running service keeps running its old code. After you change code, restart the
service you own and reload extensions.

## Canvas actions

| Action | What it does |
|---|---|
| `get_state` | Status, latest scan, kept reference, what changed, activity and DICOM evidence. Image arrays and file bytes are left out |
| `select_preset` | Choose `still`, `gentle` or `larger` |
| `run_experiment` | Compute a new live scan. With `waitForResult` it waits (about 90 seconds at most) and returns the summary. A scan already running is rejected |
| `pin_baseline` | Keep a completed scan, by run ID, as the reference. The page calls this **Keep as reference** |
| `get_comparison` | The latest scan and the reference, with parameters, provenance, changes and activity |
| `get_pr_note` | Markdown evidence for a pull request. Practice data only |

Each action shows up in **Recent activity** as Copilot's. The label is display
text that the caller reports about itself. It is not security.

## Command-line bridge

If the native Canvas actions are not available (for example in the Copilot CLI),
drive the same running service from a terminal. In the CLI, start `copilot` from
the same checkout while `npm run scanlab` runs in another terminal.

```powershell
npm run scanlab:control -- state
npm run scanlab:control -- run still
npm run scanlab:control -- state
# When the status is succeeded, use the run ID it printed:
npm run scanlab:control -- pin ACTUAL_RUN_ID
npm run scanlab:control -- run gentle
npm run scanlab:control -- state
```

The bridge accepts only known commands and presets. It uses the service's token
internally and never prints it, never starts a second simulator and never replays
a result. Wait for `succeeded` before pinning. Its calls appear in **Recent
activity** as "A script".

A prompt for an agent:

```text
Use only node scripts/scanlab-control.js to inspect the active ScanLab session, run still, wait for completion, pin the completed run ID, run gentle, and verify the baseline ID and result hash remain unchanged. Do not edit, install, publish, control desktop applications, or print tokens. Report actual results.
```

Grant only this command family. A successful bridge run proves that the shared
service works. It does not prove that anyone clicked in the app.

## Repository instructions and skill

`.github/copilot-instructions.md` holds the rules for every Copilot session in
this repository: synthetic data only, reuse the pinned libraries, never replace a
failed library call with a hardcoded result, plan before building, and take no
remote action without separate approval. Instructions guide behavior. They do not
enforce it, so check the real tool permissions too.

The `scanlab-demo` skill tells Copilot how to prepare, run and validate ScanLab,
which Canvas actions to prefer, and what it must not do.

## Issue and pull request templates

- `03-scanlab-comparison.md`: the bounded **Keep as reference** task for ScanLab.
- `01-validation-task.md` and `02-review-exercise.md`: the request-desk tasks
  (see [request desk](request-desk.md#github-drafts-and-ci)).
- `PULL_REQUEST_TEMPLATE.md`: has a **Validation** section. Paste the ScanLab
  note under **UI/API evidence**.

Templates do not trigger Copilot. Assigning an issue and requesting a review are
separate actions, and each needs your approval before you take it.

## Readiness task

A manual task in the Copilot app that runs the full ScanLab check and reports the
result. It never fixes anything.

In **Automations → New automation**, use the name `ScanLab local readiness`, the
trigger **Manual**, this checkout as the project, and **Run in the cloud** off.
Keep scoped tool approvals and do not enable always-allow. Prompt:

```text
Use the scanlab-demo skill to check this local ScanLab demonstration.
Report the actual working directory. Run npm run scanlab:check without editing
source files, installing or upgrading dependencies, or fixing failing tests.
Report the exact command, exit status, passed/failed checks, and any setup
blocker. Do not fabricate evidence or call an old result a new run.
Include the independent DICOM download/parser checks and immutable baseline
assertions in the report. Distinguish Julia, browser, Canvas-adapter and actual
Copilot-app GUI evidence. A passing browser test does not certify the app.
Do not change Git, create schedules, publish anything, or access other projects.
Stop after reporting.
```

You create this task by hand in the app. Nothing in this repository creates or
schedules it. The test runner is the gate and the agent only summarizes. Install
and compile before the audience joins, never as an automated repair.

## Limits

- The host may block Computer Use on the Copilot app itself. Do not bypass it.
  Operate the Canvas yourself and record that as a human check, separate from the
  automated ones.
- Browser tests and Canvas adapter tests do not certify the Copilot app. See
  [Testing](testing.md#what-has-not-been-verified).
- Copilot access and features depend on your account and policy.

Official docs: [Copilot app quickstart](https://docs.github.com/en/copilot/get-started/quickstart-copilot-app)
and [Copilot CLI command reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference).
