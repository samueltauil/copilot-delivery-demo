# Copilot demo: one task, one clear flow

**Follow this page.** The form is just a prop. The story is how Copilot helps a
developer and a Business Analyst understand, plan, deliver, and review work.

**Opening:** "We will improve one small workflow. Watch what we ask Copilot to
do, where we approve it, and what evidence we check."

**Flow:** Ask -> Plan -> Implement -> Explain -> Delegate -> Review -> Control.

## Before the audience joins

Use the **presenter setup** at the end of this page. Open one browser tab for the
form, one VS Code window for the starting worktree, and the approved GitHub demo
repository if available. Do not tour folders or explain the application's stack.

Local application checks have passed. Product instructions below were checked
against official documentation on **October 16, 2026**; that is not a claim that
every interface or hosted action was exercised. Exact sources and limits:
`docs\official-docs-validation.md`.

No remote has been published by this task. Steps 5-7 are live demonstrations
only after separately approved GitHub setup. Otherwise explain the controls and
say "not exercised here"; do not present a draft or illustration as a live result.

**Checkpoints:** `demo-start` (rule missing) and `demo-candidate` (rule
implemented) are immutable local tags. Never move them.

## 1. Ask: "Help me understand"

**Do:** Open Chat with `Ctrl+Alt+I`, start a new chat, select **Local** in the
Session Target control, then **Ask**. If your installation has no target picker,
use its available Ask role; do not assume controls from another harness. [D1]

**Paste:**

```text
Explain how someone submits a request, in five business steps.
Name only the files that support those steps. Do not edit anything.
Find the submission endpoint and suggest one request command for PowerShell;
do not execute it or invent a response.
```

**Point to:** One file reference and the plain-English flow. No source-code tour.
**Say:** "A BA can start by understanding behavior, without implementing code."

After reviewing the generated command, approve one synthetic submission in the
isolated demo. Paste the **actual** status/body back into chat and ask:
`Explain what this response means to the requester. Do not assume it succeeded.`

## 2. Plan: "Agree the outcome before the edit"

**Do:** In the same Local conversation, select **Plan**. [D2]

**Paste:**

```text
Plan a small change: require requesterName. Missing, null, non-string, empty
or whitespace-only names must create nothing and return HTTP 400 with
"Requester name is required." Trim valid names and preserve other behavior.
Include an accessible inline error, tests, one user story and three acceptance
criteria. Identify only the files that need changing. Do not implement yet.
```

**Point to:** The story, three criteria, affected files and proposed checks.
**Say:** "This is the review checkpoint. We agree the business rule and scope."
Stop if the plan adds unrelated work or leaves the behavior ambiguous.

## 3. Implement: "Let it act, then check"

**Do:** Read the plan. If acceptable, choose **Start Implementation** in the
Local plan response. This starts the implementation request; do not submit a
second duplicate task. Keep scoped tool approvals, not automatic approval. [D2]

**If using the Copilot harness instead:** Review its plan card and choose
**Implement Plan**, not Autopilot. The names differ because the harness differs.

**Point to:** An actual tool request, changed file and diff. Open Source Control
with `Ctrl+Shift+G` and select a changed file to inspect its diff. [D3]

**Paste after the agent finishes:**

```text
Check the diff against the approved scope. Run npm run check.
Report what actually passed, failed, or could not run. Do not weaken tests.
```

**Then:** Stop the form's server with `Ctrl+C`, run `npm start` again, and refresh
the browser. This app does not reload server code automatically.
Try blank name -> clear error; valid name -> success; corrected input -> success.
Point to the API test as well: UI validation alone does not prove enforcement.

**Say:** "We trust the inspected change and observed checks, not a success claim."
If a check fails, show it and fix only the approved scope.

## 4. Explain: "Turn delivery into a BA handoff"

**Do:** Keep the conversation; do not start another implementation.

**Paste:**

```text
From the actual diff and test results, draft a business summary, three acceptance
criteria, three test scenarios, a release note, and questions for developers.
Cite the supporting code/tests. Label assumptions. Keep it nontechnical.
```

**Point to:** One criterion, its test, and the visible behavior.
**Say:** "Copilot drafts the artifacts. A person checks the business meaning."
This is a draft, not automatic approval of production requirements.

## 5. Delegate from the web: "The same task, assigned to an agent"

**Do, only in the approved hosted demo:**

1. Open **Issues -> New issue** and choose the request-name validation template.
2. Review its populated scope/criteria and create the issue without an assignee.
3. After scope and agent approval, open **Assignees -> Copilot**.
4. Confirm the fresh run's base branch, which starts from `demo-start`,
   not the branch where the local task is already finished. [D4]

**Point to:** The assignment, agent activity and linked PR as they actually occur.
**Say:** "The template prepares the task; assignment starts the implementation."
New comments on the issue are not automatically new agent input: use the linked
PR for follow-up. Do not wait for or promise a particular completion speed. [D4]

## 6. Review: "Ask for another check"

**Do:** Open the agent's PR or the separately prepared review-fixture PR.
Under **Reviewers**, next to **Copilot**, click **Request**. Read the actual
comments and inspect any suggestion before applying it. [D5]

**Point to:** A real comment, the reviewed commit, and the human decision.
If no useful comment appears, say so; use the test evidence rather than rerunning
until you manufacture a favorable result.

**Optional follow-through:** If available and approved, **Fix with Copilot**
on a review comment starts a separate coding action. After a correction, run the
checks and request re-review; new pushes are not re-reviewed by default. [D5]

**Say:** "Review helps, but it does not replace testing or human approval."

## 7. Automate the request, not the trust

**Do:** Show an already approved narrow demo ruleset, or explain the official
setup without saving settings. Repository **Settings -> Rulesets -> Rulesets ->
New ruleset -> New branch ruleset**. Set **Enforcement Status: Active**, choose
only the approved demo target branch, then select
**Automatically request Copilot code review**. [D6]

Choose **Review new pushes** and **Review draft pull requests** only deliberately.
Click **Create** only with separate administrator approval.
Use a fresh PR for this example, without also clicking manual Request, so the
automatic trigger is distinguishable. Check inherited/personal rules first.

**Say:** "A policy can request the review. A person still evaluates the result."
If your account lacks the controls, label this unavailable; do not improvise
an Actions workaround or claim the template enabled automatic review.

## 8. Close: "Visible actions, focused context, useful outcomes"

**Show:** Relevant files, approval boundary, diff and real checks from this run.
In CLI, `/context` and `/usage` expose session signals; verify the installed help.
They are not the same as enterprise adoption or billing reports. [D7][D8]

**Say:** "Keep the task and context focused. Verify permissions and billing
controls; do not infer savings or complete observability from one demonstration."

**If an authorized administrator is present:** In enterprise settings, open
**Billing & licensing -> AI usage**, inspect the actual user/model/group filters,
then review existing budget controls. Confirm whether **Stop usage when budget
limit is reached** is enabled; an alert alone need not block spend. Do not change
settings or display customer usage without approval. [D8]

**Capture:** One developer workflow, one BA workflow, and one reporting question.
Give each an owner and a success measure only when the audience agrees them.

**If asked about SharePoint, Foundry or Copilot Studio:** "Those need discovery
around users, permissions, data, failures and costs. This example did not
evaluate them."

**Close:** "Ask clearly, review the plan, inspect the change, validate the result."

## If they ask: "Can I do this in CLI or the app?"

Do not repeat the implementation. Show the equivalent controls or explain them:

| Surface | Simple instructions | Boundary |
|---|---|---|
| CLI | In the demo worktree, run `copilot`; use `/plan`, approve only the bounded change, inspect `/diff`, and run the agreed checks. Use `/permissions` to inspect the actual controls. [D7] | `/ask` is a side question, not proof of enforced read-only access. Do not imply a second implementation was rehearsed. |
| GitHub Copilot app | Add the local worktree under **Projects**; start a session; use `/plan`, review it, then **Interactive** for approved work; click **Changes** for the diff. [D9] | App access/policy is separate from CLI access. Do not click Create PR without publication approval. |
| GitHub Mobile | Use available Copilot questions and follow-up while away from the workstation. [D10] | Not a replacement for this local browser/test environment. |

## Presenter setup: the props, not the presentation

From `C:\Users\tauilsamuel\Development\playground`, choose a **new** run name:

```powershell
git worktree add -b demo/presenter-one .demo-runs\presenter-one\worktree demo-start
Set-Location .demo-runs\presenter-one\worktree
npm ci
npx playwright install chromium
npm run check
code -n .
npm start
```

Stop if the branch/directory already exists. Open `http://127.0.0.1:3000`.
Baseline tests passing does not certify the deliberately absent name rule.
If the port is occupied, choose another PORT; never kill an unrelated process.
In a second terminal, use the same worktree for validation. Restart only your
own server after implementation. Use synthetic input; do not attach `context`.

**Web preflight, separately approved:** Publish only intended demo refs and
templates; never add the ignored source context. Templates must reach the remote
default branch for the chooser. Prepare a fresh starting branch for step 5 and,
if needed, a separate regression PR for steps 6/7. Use `docs\web-scenarios.md`
and the existing local draft generator; a prefilled link is a draft, not a
created issue or trigger. [D11]

**Repeat:** New run name -> fresh worktree/branches/issues/PRs. Keep checkpoints
and prior evidence; do not force-reset, force-push or bulk-delete.
`demo-complete` remains withheld until the
separately recorded interactive/manual acceptance checks are satisfied.

**Reference only:** `docs\facilitator-playbook.md` contains the full coverage
matrix and fallback cards. Do not present that matrix or repository internals.
