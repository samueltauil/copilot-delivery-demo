# Local ScanLab readiness automation

This is a versioned task definition, not a claim that an automation has already
been created or executed in an account.

In GitHub Copilot app, use **Automations -> New automation**:

- Name: `ScanLab local readiness`
- Trigger: **Manual**
- Project: this approved local checkout
- **Run in the cloud: off**
- Retain scoped tool approvals. Do not enable always-allow or broad permissions.

Prompt:

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

Use **Create and run** only for this manual local task. Inspect the actual result,
including a failed run. The deterministic test runner supplies the gate; the
agent supplies a summary. Run history and the app configuration are not stored
in this Markdown file.

The repository is public; repository-level cloud automations have separate
availability requirements. This task does not change visibility or use them.

## Presentation gate

The task definition is versioned here, but no app automation is automatically
created or scheduled. A presenter must explicitly create/run the manual task in
the actual checkout. Compilation, dependency setup and dataset acceptance happen
before the audience joins, never as an automation repair.

If the host blocks Computer Use on Copilot itself, retain that exact limitation.
A human can operate the existing Canvas and verify its two run IDs, the unchanged
reference (pinned) image and file fingerprint, linked controls and DICOM download. Record that as human
app evidence, separately from automated browser evidence. Do not bypass the host
through another UI control mechanism or relabel browser checks as app checks.
