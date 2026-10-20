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
Do not change Git, create schedules, publish anything, or access other projects.
Stop after reporting.
```

Use **Create and run** only for this manual local task. Inspect the actual result,
including a failed run. The deterministic test runner supplies the gate; the
agent supplies a summary. Run history and the app configuration are not stored
in this Markdown file.

The repository is public; repository-level cloud automations have separate
availability requirements. This task does not change visibility or use them.
