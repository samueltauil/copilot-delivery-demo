# Copilot presentation guide: Useful work, visible evidence

**Start with `DEMO-GUIDE.md` at the repository root.** It is the simplified
feature-first live script. This file is the supporting reference and coverage
appendix, not the page to read aloud. Official click-path validation is in
`docs\official-docs-validation.md`.

## Presenter quick start

**Core message:** Understand the workflow, agree the change, approve the work, inspect the diff, validate the behavior, and explain the business result.

**Audience:** Business Analysts, developers, and delivery/governance stakeholders.

**Delivery rule:** Use one primary Copilot interface for the main story. Explain alternatives; do not repeat the same implementation in every interface. Present the web scenario as a selectable extension, not a second application.

**Efficiency rule:** Read the eight slide cards for the main narrative. Open the prompt cards when demonstrating. Use the appendices for specific questions and the coverage matrix to audit completeness. Do not read the entire matrix aloud.

**Honesty rule:** A planned output is not a working feature. A prepared screenshot is not a live run. A completed review is not proof of correctness. A passing test proves only what that test covers.

### Current readiness

| Asset or claim | Actual status when this guide was written | Presentation consequence |
|---|---|---|
| Implementation plan and this guide | Authored; repository guide adapted from the session artifact | Can present the workflow, requirements, and recorded local evidence |
| Application, UI/API, automated tests | Implemented; 14 Node and 5 Chromium tests passed | Show actual current behavior; do not overstate test coverage |
| Issue/PR templates and local draft generator | Implemented and checked locally | Not published to a GitHub default branch; no hosted template-rendering claim |
| Review regression/correction fixtures and Git checkpoints | Customer-neutral starting/reference checkpoints; prior isolated fail/correct replays observed | demo-complete withheld pending required interactive rehearsals |
| Primary-interface rehearsals | CLI authoring observed; VS Code/desktop interactive paths not rehearsed | Do not claim cross-surface parity; see docs/evidence/rehearsal.md |
| Hosted issue, agent PR, Copilot review, automatic review | Not created or triggered | Explain the intended steps; live execution requires separate approval and preparation |
| Administrative usage/billing evidence | Not collected | Discuss available questions and controls, not customer metrics |

**Safe opening today:** "The local application and automated checks exist. I will distinguish that evidence from unobserved interface rehearsals and web workflows that have not been triggered."

After implementation, replace status entries only with recorded evidence, not an assumption that a task was completed.

## Preflight and evidence record

| Check | Record before presenting | If unavailable |
|---|---|---|
| Primary interface | Product/version, actual harness, model, selected mode/role | Use a verified interface; mark alternatives untested |
| Permissions | Read-only controls for understanding; explicit write/command approvals | Do not claim prompt text enforces read-only access |
| Demo isolation | Run ID, worktree, starting commit, clean status, synthetic data | Do not edit an unknown/dirty workspace |
| Application | Actual local URL, successful startup, visible UI | Present the contract as planned; do not fabricate a response |
| Validation | Exact commands, tested commit, actual results and known failures | Say "not validated"; do not show target output as actual output |
| Web extension | Approved repository/base branch, entitlements, policies, active review settings | Use the static scenario cards and say "not exercised" |
| Usage | Observed session view; approved admin access or sanitized evidence | State that enterprise data is unavailable |
| Fallback evidence | Real captured run with commit/interface labels, or explicitly illustrative material | Never describe a recording or mockup as live |

Do not run installs, enable broad permissions, change tenant settings, or create remote resources as an unannounced setup step.

## Main presentation: eight slide cards

### Slide 1 - One business problem, one controlled change

**On screen**

- A request needs a requester name.
- Developers implement the rule; BAs explain and validate the experience.
- One application, one bounded change, visible evidence.

**Say:** "The practical pattern is understand, plan, approve, act, validate, and explain. We are not designing an enterprise agent architecture today."

**Show when ready:** The request form and list using synthetic data. Explain that data is in memory and disappears when the server restarts.

**Implemented contract:** Missing or invalid names are rejected with `Requester name is required.`; valid names are trimmed, accepted, and listed. Use actual run evidence rather than claiming a live result before showing it.

**Transition:** "First we establish what the application actually does, without changing it."

### Slide 2 - Understand before acting

**On screen**

| Intent | Appropriate behavior | Control to demonstrate |
|---|---|---|
| Understand | Ask/read-only investigation | Actual read-only role/tool restrictions |
| Decide | Plan the bounded change | Review scope and stop before implementation |
| Implement | Agent/interactive execution | Explicit approval, limited permissions, diff and tests |

**Say:** "These are stages of work, not identical buttons everywhere. Identify the interface and harness first. A model choice is not a permission setting." [R1]

**Do when ready:** Use P1. Point to the referenced files and the five business steps. Use P2 to connect an endpoint and a real response to that same flow.

**Evidence:** Actual file/function references, no application diff, shell-specific request command, and observed response if executed.

**Do not claim:** "A sentence saying 'do not edit' is a security boundary" or "all Copilot products expose the same Ask mode." CLI `/ask` is not the universal equivalent of a read-only role; use the verified adapter.

**Fallback:** "We have an explanation, but I have not verified its file references or permission boundary yet."

### Slide 3 - Turn business intent into a reviewable plan

**On screen**

- Story: a requester receives a clear error instead of submitting an unnamed request.
- Invalid name: reject it and create nothing.
- Valid name: trim it, accept it, and display it.
- Corrected input: clear the error and allow submission.

**Say:** "A BA can review the outcome and acceptance criteria without approving implementation details they cannot verify. The developer checks affected files, risks, and tests."

**Do when ready:** Use P3 in the interface's supported planning workflow. Review the proposed file list and explicitly exclude unrelated changes.

**Evidence:** Written plan, acceptance criteria, validation commands, and the human approval boundary. Plan approval and tool-action approval are separate decisions. [R2]

**Stop:** Do not proceed if scope, behavior, or validation is ambiguous.

**Fallback:** "This plan is a proposal. It is not evidence that the feature exists."

### Slide 4 - Implement, inspect, and prove the behavior

**On screen**

- Approve only the requester-name rule.
- Inspect every changed file.
- Run API and browser checks.
- Read failures rather than hiding them.

**Say:** "The value is not that an agent can edit files. It is that we can connect a small approved change to observable behavior."

**Do when ready:** Use P4, inspect the resulting diff, then P5. Show a blank/whitespace submission, a valid submission, and correction after an error. Bypass UI checks in an API test to prove server-side enforcement.

**Implemented commands:** `npm test`, `npm run test:e2e`, `npm run check`. Record the current commit and actual output; prior passing evidence is not a claim that an unexecuted live command passed.

**Evidence:** Commit/diff, actual exit status and output, API status/body, visible UI error/success, no request created on rejection.

**Failure wording:** "This result failed validation. We will inspect the cause and make only a correction within the approved scope. We have not demonstrated completion."

### Slide 5 - Produce BA artifacts grounded in the result

**On screen**

- Business summary and five-step workflow.
- User story, three acceptance criteria, three test scenarios.
- Release note, open questions, code/test references.

**Say:** "Copilot drafts these artifacts; the BA owns whether they express the intended business outcome. Current code explains implemented behavior, not necessarily the correct business policy."

**Do when ready:** Use P6 against the actual diff and test results. Compare one criterion with one test and the visible UI behavior.

**Illustrative story:** "As a requester, I want a clear message when my name is missing so I can correct the request before submitting it."

**Evidence:** One requirement-to-code-to-test chain and human disposition of open questions.

**Fallback:** "This is an illustrative draft, not an approved requirement or a verified release note."

### Slide 6 - Trigger the right Copilot workflow from GitHub.com

**On screen**

| Scenario | Human action or configured trigger | Intended output |
|---|---|---|
| W1: implement from an issue | Review the pre-populated issue, then explicitly assign Copilot with the correct base branch | Agent implementation and linked PR |
| W2: review a PR | Request Copilot through the PR's Reviewers control | Review feedback to evaluate |
| W3: automatic PR review | Separately approved native automatic-review configuration | Review on the configured PR events |

**Say:** "An issue template prepares the task; it does not itself start coding or request a review. Issue assignment and PR review are different triggers." [R3][R4]

**Default presentation:** Explain all three; demonstrate W1/W2 only after approval and preparation. Keep W3 as an optional appendix unless its configuration was approved and rehearsed. [R5]

**Evidence when exercised:** Actual selected base SHA, issue/PR link, trigger, reviewed commit, real output, test results, and human decision.

**Repeat/reset:** "Each run gets fresh branches and issues/PRs from stable checkpoints. We do not erase prior runs or rewrite the completed application."

**Fallback:** "These are prepared steps, not an executed cloud-agent or review result."

### Slide 7 - Control context, permissions, usage, and expectations

**On screen**

- Context: select the workflow and relevant files; avoid unrelated documents.
- Actions: review permissions, plan, diff, and validation evidence.
- Usage: distinguish session signals from authoritative billing.
- Governance: use approved policies, reporting, and human accountability.

**Say:** "Smaller, focused tasks are easier to inspect. They do not guarantee a particular bill. A session usage view is not an enterprise cost report, and tool activity is not a complete audit trail."

**Show when available:** The verified session context/usage view. Explain that input/output, selected model, retries, and agent activity matter; do not infer a tenant-wide number from one session.

**Admin explanation:** Identify who can access adoption and billing reports, what scope they cover, and which budget/enforcement settings apply. Use actual approved data or label the view illustrative. Budget alerts alone are not necessarily a blocking spending control. [R6]

**Explicit limit:** "We have not measured your adoption, savings, cost drivers, or full agent observability in this demonstration."

**Architecture boundary:** "SharePoint reliability, Foundry evaluation, and production agent observability need discovery. This local example does not validate them."

### Slide 8 - Close with decisions, not promises

**On screen**

- Choose one real developer workflow.
- Choose one real BA workflow.
- Choose one governance/visibility question requiring data.
- Assign an owner and an observable success measure.

**Say:** "The reusable outcome is a controlled process with evidence, not a promise that every AI suggestion is correct."

**Capture:** Scenario, prompts, guardrails, expected outputs, validation, owner, and success measure for each follow-up.

**Success check:** Participants can explain when to understand/plan/act, identify the approval boundary, inspect a diff/test result, describe a BA use case, and name what remains unverified.

**Closing line:** "Scope the task, review the plan, inspect the change, validate the result, and explain it in business terms."

## Copy-ready prompt cards

These are proposed prompts. Attach the actual repository/plan/diff only after the required assets exist. Do not send internal meeting context or customer data as demonstration input.

### P1 - Understand the workflow

```text
Read and explain this request-submission workflow. Do not edit files or run
state-changing commands. Identify at most three BA-relevant files and why they
matter, cite the business-rule functions, and summarize the flow as five
plain-English steps. Separate observed behavior from assumptions.
```

### P2 - Discover an endpoint and interpret a response

```text
From the actual code, identify the request-creation endpoint and payload.
Generate one valid and one missing-name request command for my current shell.
Do not execute them yet. After I provide the real status and response body,
explain the business outcome and any uncertainty. Do not invent output.
```

On Windows, prefer an explicitly generated `curl.exe` or native PowerShell command with correct quoting. Approve execution before POSTing; an API submission changes the demo's in-memory state.

### P3 - Plan and translate for a BA

```text
Plan only the requesterName validation change. Reject missing, null,
non-string, empty, and whitespace-only values with HTTP 400 and
"Requester name is required."; trim valid names and preserve existing behavior.
Name the affected files, smallest safe change, risks, and exact validation.
Include a user story, three acceptance criteria, and three test scenarios.
Do not edit application files or implement. Stop for human review.
```

### P4 - Implement the approved scope

```text
Implement only the approved requester-name validation plan in this demo
worktree, including server enforcement, accessible UI feedback, and tests.
Do not refactor unrelated code, add unrelated dependencies, publish anything,
or create GitHub resources. Show the changed files and diff; stop if the
approved behavior or permission scope is insufficient.
```

### P5 - Validate and report evidence

```text
Review the diff against the approved plan and run the agreed validation
commands with permitted tools. Report the exact commands, exit status,
results, and remaining gaps. Do not treat a UI check as server validation.
Do not hide failures, weaken tests, or claim unexecuted checks passed.
```

### P6 - Draft the BA handoff

```text
Using the actual final diff and test evidence, draft a business summary,
five-step workflow, one user story, three acceptance criteria, three test
scenarios, a nontechnical release note, and questions for developers.
Cite code/test evidence. Separate implemented behavior, proposed requirements,
and unverified assumptions. Output a draft for human review, not an approval.
```

### P7 - Draft an issue without triggering work

```text
Draft an issue for the request-name validation scenario using the template.
Include run ID, starting branch/SHA, exact rule, acceptance criteria, bounded
file scope, exclusions, and validation commands. Do not create or update an
issue, assign Copilot, open a PR, request review, or change settings.
Return the draft for human review.
```

## Appendix A - Choose an interface without promising parity

| Surface | Presenter instruction | Honest limitation |
|---|---|---|
| VS Code | Identify the session target/harness; use supported Ask/Plan/Agent controls; show Source Control and tests | A Copilot harness and a VS Code Local harness can have different workflows/tools [R1][R2] |
| Copilot CLI | Verify installed help and permissions; use supported planning, diff, and usage commands | `/ask` is a side-question feature in the inspected CLI help, not proof of enforced read-only access |
| Copilot desktop app | Connect the demo worktree; verify planning/interactive controls and Changes | Shared CLI foundations do not establish identical tools, account policy, or UI [R7] |
| GitHub.com/cloud agent | Use the approved hosted run base and distinct assignment/review actions | Cannot validate uncommitted local code or inspect the presenter's local application by assumption [R1][R3] |
| Mobile | Discuss available repository/agent follow-up paths when enabled | Do not imply the phone supplies the local browser-test environment [R8] |
| Other Copilot IDEs | Reuse ordinary prompts, requirements, and evidence files | Native prompt files and customization support differ; mark untested surfaces unverified [R9] |

If moving surfaces, pass the goal, approved scope, base SHA, affected files, criteria, commands/results, and open questions. Recheck permissions at the destination. Do not assume settings or conversation synchronization. [R1]

## Appendix B - Web extension presenter cards

### W1: Issue to PR

**Prepare:** Validation issue template, unique run ID, approved remote, fresh base branch from `demo-start`, correct base SHA, and cloud-agent access.

**Show:** Editable draft, human review, actual assignment control, selected base, agent activity, linked PR, diff, and test output. [R3]

**Do not say:** "Creating or labeling the issue automatically runs Copilot."

**If blocked:** "We have not started the agent. The prerequisite or permission is unavailable." Use P7 and the static issue draft, without implying hosted execution.

### W2: Manual PR review

**Prepare:** Completed checkpoint in an isolated worktree; apply only the whitespace-validation regression fixture; retain the tests and expected failure; publish only after approval.

**Show:** Regression diff, failing API check, actual Reviewers request, real Copilot review, human assessment, approved correction, passing checks, and requested re-review. [R4]

**Do not say:** "Copilot will definitely find this bug" or "no comment means the code is correct."

**If missed:** "The test caught this defect; the review did not identify it in this run. This is why review and deterministic validation are complementary."

### W3: Automatic review

**Prepare:** Separate run PR; administrator approval; recorded personal/repository/inherited settings and exact target branches; explicit draft/new-push choices.

**Show:** Configured trigger and a real review of the current commit, without a manual review request. Restore only approved run-owned configuration changes. [R5]

**Do not say:** "A PR template enables automatic review" or "turning off my personal toggle overrides organization policy."

**If unavailable:** Present the configuration boundary and use manual review. Do not quietly add an automation workflow or broaden policy.

### Repeat/reset explanation

**Show when implemented:** A new run manifest and new branches from immutable checkpoints. W1 begins at `demo-start`; W2/W3 use `demo-candidate` plus the isolated regression, labeled as a local candidate until full acceptance.

**Say:** "We replay the scenario without deleting the repository. Git resets do not undo hosted issues, reviews, usage, or billing."

**Cleanup boundary:** Identify exact run-owned resources and request approval before closing issues/PRs, deleting branches, stopping agents, or removing clean worktrees. Do not force push or merge the regression into the canonical application.

## Appendix C - Governance and architecture questions

| Question | Direct, honest answer | Follow-up evidence needed |
|---|---|---|
| What is Copilot doing? | Show surfaced references, tools, approvals, diffs, and results; do not imply complete internal visibility | Required audit events, collection scope, retention, access, errors and gaps |
| How do we avoid unintended changes? | Read-only controls where supported, isolated scope, explicit approval, diff review, and validation reduce risk; prompts alone do not enforce safety | Actual permissions/policies and observed behavior |
| How do we avoid token waste/cost spikes? | Scope context, bound tasks, inspect usage, and use verified billing/budget controls; no guaranteed savings | Billing regime, report scope, model/usage patterns, enforced limits [R6] |
| What does admin reporting answer? | Adoption/active use and billing reports answer different questions; a demonstration does not measure business value | Authorized reports, reporting period/latency, audience roles, agreed value measures |
| Can BAs use a specialized agent? | Start with the shared BA prompts and human-reviewed artifacts. A specialized agent is a discovery option, not built into this kit | Repeated task, required context, tool restrictions, evaluation criteria |
| Can this prove SharePoint reliability? | No. Discover user/data permissions, representative questions, freshness, grounding/citation quality, failure behavior, and evaluation needs | Approved data/access model, test set, measured failures and costs |
| Should we move to Foundry or change Copilot Studio architecture? | No architecture recommendation from this demo; start with users, data, actions, risk, observability, and cost drivers | Discovery findings and explicit evaluation requirements |
| What about orchestration, throughput, routing, migration, or tenant consolidation? | Outside this presentation's implementation scope; record the question and owner rather than improvising a design | Separately scoped architecture discovery |

Do not repeat internal meeting/adoption/support assertions as independently verified facts. Use a neutral recap: "The supplied brief prioritizes practical repository work, BA outputs, safe changes, visibility, and cost awareness."

## Appendix D - Failure and diversion cards

| Situation | Presenter action and honest wording |
|---|---|
| Demo becomes complex | Return to one repository, one request flow, and one rule; do not add services or provisioning |
| Agent proposes a broad refactor | Stop before applying; request a narrower plan and inspect any existing diff |
| Test fails | Show the failure; investigate within scope; label completion unverified until corrected |
| Runtime/auth/network/policy blocks | Explain the blocker; use only labeled real captures or a stated design walkthrough |
| Review misses the seeded defect | Show the deterministic failure; do not rerun repeatedly to manufacture a favorable finding |
| BA audience loses the thread | Return to user intent, visible error/correction, acceptance criteria, and release note |
| Governance discussion expands | Answer the control question directly, record missing evidence and an owner, then return to the flow |
| SharePoint/Foundry/Copilot Studio architecture question | Acknowledge it, explain what this demo cannot prove, capture discovery questions |

## Appendix E - Coverage matrix

This maps every distinct requirement/theme from the supplied workshop brief and agreed additions. Repeated bullets and duplicate prompts share a row. Source line ranges refer to that original brief, which is not distributed with this repository. A coverage disposition means the guide addresses the topic; it does not mean implementation or validation is complete.

| ID | Requirement / source | Disposition | Where and evidence/limit |
|---|---|---|---|
| C01 | Practical, simple repo-based session; avoid over-engineering (7-13, 27-32, 80-98, 283-318) | Explanation + live demo when ready | Slide 1; one local process/UI/API, one rule, synthetic data |
| C02 | Acknowledge prior workshop themes (15-49, 89-98) | Explanation | Slide 1 and Appendix C; recap supplied priorities, not unverified internal history |
| C03 | Explain unfamiliar repository and entry points (28-32, 100-134, 322-326) | Live demo when ready | Slide 2/P1; file/function references |
| C04 | Find endpoint, generate curl, run/interpret response (21, 28-32) | Live demo when ready | Slide 2/P2; approved shell command and actual status/body |
| C05 | Identify BA-relevant files (110-124, 328-332) | Live demo when ready | P1; bounded file list and reasons |
| C06 | Five-step plain-English business flow (38-44, 121-124, 334-338) | Live demo when ready | Slides 2/5; P1/P6 |
| C07 | Expected UX and clear error/correction (38-44, 142-158, 195-219) | Live demo when ready | Slides 3-5; invalid/valid/corrected UI behavior |
| C08 | Requirements, user story, acceptance criteria (38-44, 153-158, 346-350, 410-415) | Live demo when ready | Slides 3/5; P3/P6 with human validation |
| C09 | Test scenarios and testing support (38-44, 195-219, 410-415) | Live demo when ready | Slides 4/5; API/browser checks and BA scenarios |
| C10 | Specialized BA-style agents (38-44) | Appendix + deferred follow-up | Appendix C; not implemented or required for BA usefulness |
| C11 | Ask/Plan/Agent distinctions and safe phrases (53-55, 65-72, 366-372) | Explanation + live demo when ready | Slides 2-4; actual harness controls, not universal mode-name promises |
| C12 | Bounded plan before edits, files/risks/validation (136-165, 340-350) | Live demo when ready | Slide 3/P3; stop for human approval |
| C13 | Minimal implementation; no unrelated refactors (167-193, 352-356) | Live demo when ready | Slide 4/P4; scope and bounded diff |
| C14 | Changed files, diff, exact commands, failure output (179-193, 227-235, 396-400) | Live demo when ready | Slide 4/P5; actual outcomes, never hidden failures |
| C15 | What Copilot is doing / action visibility (8, 53, 86, 190-193, 388-400) | Explanation + live demo when ready | Slides 2/4/7; surfaced tool trail is not a complete audit |
| C16 | Prevent unintended changes and control work (55, 70, 229-231, 396-400) | Explanation + live demo when ready | Slides 2-4; permissions, worktrees, approval, diff, tests |
| C17 | BA participation without becoming developers (10, 57, 131-134, 402-415) | Explanation + live demo when ready | Slides 3/5; BA validates outcomes, developer validates implementation |
| C18 | Business summary, release note, developer questions (195-219, 358-362, 410-415) | Live demo when ready | Slide 5/P6; draft grounded in actual diff/results |
| C19 | Focused prompts/files; avoid huge context; small steps (9, 56, 72, 227-233, 374-386) | Explanation + live demo when ready | Slide 7; bounded P1-P6 and verified usage view |
| C20 | Admin governance and responsible use (21, 45, 234-235, 438-442) | Explanation + appendix | Slide 7/Appendix C; actual controls versus prompt guidance |
| C21 | Cost spikes, usage visibility, no opaque behavior (47, 58, 234-235) | Explanation + appendix | Slide 7; no invented metrics or guaranteed savings |
| C22 | Agent observability: inputs/outputs/actions/errors/cost drivers (235, 432-448) | Explanation + deferred follow-up | Slide 7/Appendix C; show available evidence and state gaps |
| C23 | Admin adoption, value, spending reports (444-448) | Explanation + appendix | Slide 7/Appendix C; reporting access and value need real data |
| C24 | SharePoint reliability / avoid expensive unreliable designs (48, 59, 432-436) | Explanation + deferred follow-up | Slide 7/Appendix C; discovery/evaluation, no reliability claim |
| C25 | Foundry evaluation only after discovery (49, 421-436) | Explanation + deferred follow-up | Slide 1/Appendix C; no architecture recommendation |
| C26 | Avoid cloud, services, secrets, production, long setup (283-301) | Explanation / preflight | Readiness/preflight/Slide 1; local demo scope; hosted agent work is separate |
| C27 | Avoid migration, orchestration, throughput/routing, deep comparison, ingestion, tenant details (417-436) | Deferred follow-up | Appendix C; explicit boundaries and owner |
| C28 | Demo complexity and broad-refactor risks (454-455) | Appendix | Appendix D; return to scope or stop |
| C29 | Validation failure mitigation (456) | Explanation + appendix | Slide 4/Appendix D; show failure and bounded correction |
| C30 | Architecture diversion mitigation (457) | Appendix + deferred follow-up | Appendices C/D |
| C31 | BA inclusion and governance dominating discussion (458-459) | Appendix | Appendix D; return to outcomes and evidence |
| C32 | Opening/transitions/closing script (253-281) | Explanation | Eight slide cards provide speaker lines and transition |
| C33 | Capture developer workflow, BA workflow, visibility question (241-251) | Explanation / close | Slide 8; explicit follow-up capture |
| C34 | Two follow-up playbooks with scenario/prompts/guardrails/outputs/validation/owner/measure (461-476) | Explanation + deferred follow-up | Slide 8; no owner or success metric invented |
| C35 | Session success criteria (478-486) | Explanation / close | Slide 8; comprehension/evidence checks, not guaranteed adoption |
| C36 | VS Code, CLI, desktop app paths (agreed addition) | Explanation + appendix | Slide 2/Appendix A; one live primary surface, other paths verified separately |
| C37 | GitHub.com/cloud/mobile alternatives (agreed addition) | Explanation + appendix | Slide 6/Appendices A/B; entitlements, context, permissions |
| C38 | UI/API name rule and before/after checkpoints (agreed addition) | Live demo when ready | Slides 1/4; exact rule, API bypass check, state isolated |
| C39 | Pre-populated issue assigned to Copilot (agreed addition) | Explanation + optional live demo | Slide 6/W1; draft/create/assign are separate |
| C40 | Manual PR code review (agreed addition) | Explanation + optional live demo | Slide 6/W2; actual Reviewers request and review evidence |
| C41 | Automatic PR review, drafts and new pushes (agreed addition) | Appendix + optional live demo | W3; separate approval, effective policy, current commit |
| C42 | Templates, draft links, run manifests, repeat/reset (agreed addition) | Explanation + optional live demo | Slide 6/Appendix B; fresh resources, not destructive reset |
| C43 | Seeded review defect and correction (agreed addition) | Optional live demo | W2; test-backed fixture; no promised Copilot detection |
| C44 | No publication, triggers, settings changes, cleanup without approval (agreed addition) | Explanation / preflight | Readiness/preflight/Appendix B; no implicit consent |
| C45 | Honest status, no fake metrics/parity/results (current request) | Explanation throughout | Readiness table, evidence gates, fallback language |

## Presenter claim audit

Before delivery, replace these unsafe claims:

| Do not say | Say instead |
|---|---|
| "Ask can never change anything in every product." | "This verified role/tool setup is read-only; otherwise I will not claim enforcement." |
| "The plan or prompt makes this safe." | "The plan scopes the work; actual permissions, review, and tests are separate controls." |
| "All actions/context are visible." | "Here is the activity and evidence this interface exposes, with these gaps." |
| "Short prompts prevent cost spikes." | "Focused context helps control scope; actual costs require billing and budget evidence." |
| "The template triggered Copilot." | "The human assignment, review request, or approved automatic policy triggered this workflow." |
| "Copilot found the bug, so it is fixed." | "We assessed the feedback, changed the code, and verified these checks." |
| "A clean review proves correctness." | "This review found no issues; these tests and human checks remain necessary." |
| "This proves SharePoint/Foundry is reliable." | "Those systems were not evaluated by this local demo." |
| "We reset everything." | "We started a new isolated run; historical hosted records and usage remain." |
| "This is ready." | "These assets were implemented and these checks passed; these gaps remain." |

## Product references

References support product capability statements, not proof of account entitlement or local execution. Recheck installed controls before presenting.

| Ref | Official source | Verification route |
|---|---|---|
| R1 | VS Code: Choose an agent harness | `https://code.visualstudio.com/docs/agents/run/agent-harnesses` |
| R2 | VS Code: Plan work with agents | `https://code.visualstudio.com/docs/agents/run/planning` |
| R3 | GitHub Docs: Kick off a task with Copilot agents on GitHub | `https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/kick-off-a-task` |
| R4 | GitHub Docs: Using GitHub Copilot code review on GitHub | `https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/copilot-code-review` |
| R5 | GitHub Docs: Configuring code review by GitHub Copilot | `https://docs.github.com/en/copilot/how-tos/copilot-on-github/set-up-copilot/configure-code-review` |
| R6 | GitHub Docs: Managing your company's spending on GitHub Copilot | `https://docs.github.com/en/copilot/how-tos/manage-and-track-spending/manage-company-spending` |
| R7 | GitHub Docs: GitHub Copilot app; installed CLI help | Sources S5/S6 in the session implementation plan; verify installed app separately |
| R8 | GitHub Docs: Asking GitHub Copilot questions in GitHub Mobile | Source S7 in the session implementation plan; verify available mobile features |
| R9 | GitHub Docs: Copilot customization cheat sheet | Source S4 in the session implementation plan; prompt-file support is surface-specific |
