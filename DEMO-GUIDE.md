# ScanLab and the request-desk learning exercise

**For the primary HLS presentation, follow [ScanLab](docs/scanlab-guide.md).**
It leads with a live synthetic imaging result, reveals Copilot's contribution,
and introduces Julia afterward. Read the current evidence before claiming
actual app/automation readiness.

The earlier request-desk walkthrough below is preserved as the secondary
learning exercise. Its commands, API contract, and name-validation task remain
unchanged. Do not mix its checkpoints with ScanLab's comparison exercise.

## Request desk: one study, one request, one verified change

**Audience:** HLS business analysts, research/delivery teams, and developers.
**Target:** a 10-15 minute local story; rehearse timing on your machine.
**Opening:** "A research coordinator has a small question. We will use existing
JuliaHealth tools, then watch Copilot help us improve one part of the workflow."

Use one VS Code window, one browser tab, and this page. Do not tour folders,
install tools live, or introduce OMOP internals before showing the outcome.
There is no AI service inside the application: Copilot helps build and review it.

## Before the audience joins

1. Complete [setup](README.md#set-up-before-presenting) and the reference checks.
2. Prepare a fresh start/reference pair using [the repeatability steps](docs/demo-lifecycle.md).
   Keep the verified dataset and package caches outside the snapshots.
3. Open the **start** snapshot in VS Code, initialize its local Git baseline as
   documented, and run `npm start`. Open http://127.0.0.1:3000.
4. Rehearse one blank submission: it is deliberately accepted here.
   Restart to clear that rehearsal request before presenting.
5. Verify actual Copilot mode, tool permissions, account access and installed
   Julia extension. Do not assume that a prompt enforces read-only access.

Start's name-rule checks are deliberately red. Reference must be green.
Neither the legacy Git tags nor the hosted Node-era rehearsal prove this
Julia flow is ready. Use the current [evidence record](docs/evidence/rehearsal.md).

## 1. Show the question

**Show:** the two counts, the "synthetic" label, and the review-request form.

**Say:** "JuliaHealth selects a tutorial cohort from a known synthetic dataset.
We reused its query functions instead of building a health-data engine.
These counts are not a clinical conclusion."

Submit a request with a blank name. Point to the unnamed accepted entry.
**Say:** "The coordinator needs a clear requester label. We have one small
delivery task, not permission to redesign the application."

## 2. Ask: establish the facts

Use the installed interface's Ask/read-only capability and paste:

```text
Explain this research-review workflow in five business steps.
Identify what comes from JuliaHealth and what this repository implements.
Explain why the cohort counts people rather than condition records.
Cite at most three source files. Do not edit files or execute commands.
```

Point to a source reference and the reuse boundary. A BA can understand the
workflow without reading a whole codebase.

## 3. Plan: agree the outcome

Use Plan, or request a plan explicitly in the available harness:

```text
Plan only the requester-name rule in docs/scenario.md.
Reject missing, null, non-string, empty and whitespace-only names without
creating anything. Preserve the exact error response and trim accepted names.
Include accessible error/correction behavior and tests. Preserve the study
snapshot and use the existing dependencies. Do not implement until approved.
```

Review one user story, three criteria, the file list and the checks.
Do not approve a new EHR integration, a custom cohort engine, or more packages.
The [official planning guide](https://code.visualstudio.com/docs/agents/run/planning)
explains the different Local/Copilot harness controls; use the labels actually
present in the installed version.

## 4. Implement: inspect and test

Approve the bounded plan and required local tools. After the agent finishes:

```text
Review the actual diff against the approved name rule.
Run npm run check. Report actual results, failures and limitations.
Do not remove or weaken assertions. Do not change the cohort query or dataset.
```

Show the Julia change and the browser change in Source Control.
Then restart `npm start`, refresh, and try:

1. Blank name: inline error, focus returns to the name, no accepted request.
2. `  Demo Coordinator  `: accepted and displayed trimmed.
3. Corrected input: error clears and keyboard submission works.

Point to the API test: bypassing the browser must still reject invalid input.
Point to the unchanged cohort counts: the feature did not alter the study.
**Say:** "The evidence is the inspected diff and observed checks, not the agent's
claim that it is done."

## 5. Explain: hand off the result

```text
From the actual diff and test results, draft a nontechnical business summary,
three acceptance criteria, three test scenarios and a short release note.
Cite evidence. Separate verified behavior from assumptions and remaining
manual checks. Do not describe this synthetic demo as clinically validated.
```

**Close:** "Use existing scientific tools. Agree a small change. Inspect what
Copilot did. Verify the behavior. Explain the result to the next person."

## Optional GitHub continuation: the same story

Do not repeat every extension in the main presentation. Choose one relevant
to the audience and obtain separate approval before any hosted action.

| Feature | What to show | Evidence/boundary |
|---|---|---|
| Issues + Copilot coding agent | The same scoped name task on a fresh committed Julia start branch | Creating an issue is not assignment; confirm the actual base before starting an agent |
| Pull requests + Copilot review | A real review of the isolated whitespace regression | Preserve the failing test; report missed findings as well as useful comments |
| GitHub Actions | The `JuliaHealth demo checks` workflow running the same setup/check commands | Local tests are not a hosted run; show the real run result only after approved publication/execution |
| Repository instructions | The short reuse, synthetic-data and validation constraints | Instructions guide behavior, not actual tool permissions |
| BA handoff | A criterion traced to the Julia API test and visible correction | A generated release note is still a human-reviewed draft |

Use [web scenarios](docs/web-scenarios.md) for exact preparation and approval
boundaries. The workflow uses pinned action commits and read-only repository
permission. It needs no secrets and does not request reviews or publish anything.
Check effective automatic policies **before** an approved push.

CLI/app/mobile alternatives stay in [the harness guides](docs/harnesses).
Do not repeat the full implementation just to tour interfaces.

## If something fails

- Setup/data failure: stop; never replace library results with hardcoded counts.
- Agent broadens scope: reject the extra change and return to the agreed rule.
- Test failure: show it and fix the actual defect; do not skip the check.
- A Copilot/GitHub feature is unavailable: say so; do not impersonate a live run.
- Need a known reference: open the prepared reference snapshot, explicitly label
  it as the reference, and explain that it is not the output of the current agent.
