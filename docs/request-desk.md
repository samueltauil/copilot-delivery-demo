# The request desk exercise

A smaller second exercise that sits next to ScanLab. A research coordinator looks
at a synthetic study snapshot and asks for a review. The coding task is one
small business rule, which makes it a clean first lesson in plan, build and
verify with Copilot.

It is separate from ScanLab. The two apps share only the HTTP helper in
`src/http_transport.jl`. Use ScanLab for the main presentation, and this one when
you want a shorter task.

## What it shows

The page shows two counts from a synthetic dataset and a form. The coordinator
types an invented name and an optional note, then sends a request. An accepted
request is an entry in a local list. It contacts no one, reruns nothing and
decides nothing clinical.

| Count | Value |
|---|---|
| People in the dataset | 2,694 |
| Distinct people with a condition record for tutorial concept 28060 ("Strep throat") | 1,677 |

The counts are people, not condition records: someone with several records counts
once. They are descriptive tutorial numbers, not prevalence estimates,
eligibility decisions, diagnoses or recommendations.

## What is reused

- [HealthSampleData.jl](https://github.com/JuliaHealth/HealthSampleData.jl)
  downloads a checksum-pinned synthetic dataset (Eunomia).
- [OMOPCDMCohortCreator.jl](https://juliahealth.org/OMOPCDMCohortCreator.jl/stable/tutorials/beginner_tutorial/)
  supplies the person and cohort queries from its beginner tutorial.
- HTTP.jl, JSON.jl and SQLite.jl handle the server, strict JSON and the database.

Nothing here generates patients, builds a cohort engine or implements a clinical
algorithm. The backend is Julia. Node only runs the browser tests and the helper
scripts. For versions, licenses and data provenance, see
[Credits](credits.md#request-desk-libraries-and-data).

## The service

It listens on `127.0.0.1` only. Requests are kept in memory and are lost on
restart. Before it opens the port it exercises each request path once against a
disposable store, then serves an empty list.

| Request | Result |
|---|---|
| `GET /api/study` | `200` with the aggregate snapshot below. No patient rows |
| `GET /api/requests` | `200` with `{"requests":[...]}` |
| `POST /api/requests` | `201` with `{"request":{"id","requesterName","description"}}` |

```json
{"study":{"dataset":"Eunomia","synthetic":true,"conditionConceptId":28060,"condition":"Strep throat (tutorial cohort)","totalPeople":2694,"cohortPeople":1677}}
```

Other outcomes: `400` for invalid input or invalid JSON, `404` for an unknown
path, `405` for a wrong method (with an `allow` header), `413` for a body over
16 KiB and `415` when the content type is not `application/json`.

## The coding task: require a requester name

The finished version requires a name.

- A missing, `null`, non-string, empty or whitespace-only `requesterName` returns
  `400` and creates nothing:

  ```json
  {"error":{"field":"requesterName","message":"Requester name is required."}}
  ```

- A valid name is trimmed, accepted (`201`) and listed. The description is
  optional text, and a non-string description is rejected.
- The page ties the error to the name field, moves focus there, keeps what was
  typed, clears the error once the name is corrected, announces success and shows
  only server-accepted data as text.
- The API enforces the rule on its own, so a request that bypasses the browser
  still fails.

Acceptance criteria:

1. An invalid name creates nothing.
2. A valid name is trimmed, accepted and listed.
3. Correcting the name clears the stale error, and the form submits from the
   keyboard.

The change touches `src/requests.jl`, `public/app.js` and `public/index.html`.
The tests are `test/requests.jl`, `test/server.jl` and
`e2e/request-submission.spec.js`. Keep the study snapshot, the 16 KiB limit, the
status codes and the explicit failures as they are. No new dependencies and no
unrelated refactors.

## Set up

You need **Julia 1.10.12**, **Node 22.20 or newer** and Git. Install Julia from
[julialang.org](https://julialang.org/downloads/). If it is not on your PATH, set
`JULIA_EXE` to the executable.

```powershell
npm ci
npx playwright install chromium
npm run setup
npm run check
npm start
```

Setup needs internet access once, for the packages and the synthetic dataset.
Review and accept the DataDeps download prompt before your audience joins.
Packages go to `.demo-runs\julia-depot` by default. Do not delete that cache to
repeat a demonstration.

Open <http://127.0.0.1:3000>. For another port, run
`$env:PORT = '3001'; npm start`. The server does not reload code, so restart it
after a change.

Before it opens the database, the server checks the file's SHA-256
(`cef9f00fe469041cfcdec527fc6f5657e2d0185bc002df38262faa642ee97c82`). If the
file is missing or changed, startup stops with an explicit error instead of
showing invented counts. After setup nothing downloads at runtime.

## Repeat the exercise

Fresh **start** and **reference** folders let you rehearse as often as you like.
**Start** deliberately lacks the name rule, so its name tests fail. **Reference**
has the finished rule and passes. Keep every test in both.

```powershell
$demoRoot = $PWD.Path
$env:JULIA_DEPOT_PATH = Join-Path $demoRoot '.demo-runs\julia-depot'
$env:DEMO_DATA_PATH = Join-Path $demoRoot '.demo-runs\data\Eunomia\eunomia.sqlite'
# Only if Julia is not on your PATH:
# $env:JULIA_EXE = 'C:\path\to\julia\bin\julia.exe'

npm run demo:local -- --run presenter-one
Set-Location .demo-runs\presenter-one\reference
npm ci
npm run check
Set-Location ..\start
npm ci
npm start
```

- Use a new run name every time. The command stops if the folder exists. Never
  overwrite or reuse someone else's run.
- Only an allowlist of source files is copied. Private notes, caches,
  dependencies and Git history are not. The two variables above let the copies
  reuse your packages and dataset, so there is no second download.
- In another terminal in **start**, with the same variables, `npm test` is
  expected to fail the name assertions and `npm run test:e2e` is expected to
  expose the missing name behavior. Treat any other failure as a real setup
  problem.
- To see Copilot's edits in Source Control, make a local Git baseline inside
  **start** only: `git init`, `git add .`, then `git commit` with your own
  message. Check what is staged first, use your configured identity and add no
  remote.
- Clean up one named run at a time. Never delete all of `.demo-runs`, because it
  also holds the reusable runtime, packages and data.

To rehearse the finished result without an agent, in an untouched **start**
folder:

```powershell
$env:GIT_CEILING_DIRECTORIES = Split-Path $PWD.Path
git apply --no-index --ignore-space-change --check --reverse docs\fixtures\julia-start.patch
git apply --no-index --ignore-space-change --reverse docs\fixtures\julia-start.patch
npm run check
```

This is a fixture, not a claim that Copilot built the change. Never apply it
after an agent has edited the same code. The ceiling stops Git from finding the
parent repository, which could otherwise report success while skipping the patch.

## Present it

Use one editor window and one browser tab. Do not tour folders, install tools
live or explain the database first. The application has no AI service in it:
Copilot helps build and review it.

Before the audience joins, prepare a run (above), open **start** in your editor,
run `npm start`, try one blank submission (it is accepted in **start**), then
restart to clear it. Check the Copilot mode, tool permissions and account access
you will use. A prompt that says "do not edit" does not make a session read-only.

**1. Show the question.** Point to the two counts and the "synthetic" label.
Submit a blank name and show the unnamed entry it created.

**Say:** "JuliaHealth picks a tutorial cohort from a known synthetic dataset. We
reused its query functions instead of building a health-data engine. These counts
are not a clinical conclusion. The coordinator needs a clear requester label,
which is one small task, not permission to redesign the app."

**2. Ask.** Use the read-only Ask mode if your interface has one.

```text
Explain this research-review workflow in five business steps.
Identify what comes from JuliaHealth and what this repository implements.
Explain why the cohort counts people rather than condition records.
Cite at most three source files. Do not edit files or execute commands.
```

**3. Plan.** Use Plan, or ask for a plan. Look for one user story, three
criteria, the file list and the checks. Do not approve a new integration, a
custom cohort engine or extra packages. The
[VS Code planning guide](https://code.visualstudio.com/docs/agents/run/planning)
describes the controls; use the labels your installed version shows.

```text
Plan only the requester-name rule in docs/request-desk.md ("The coding task").
Reject missing, null, non-string, empty and whitespace-only names without
creating anything. Preserve the exact error response and trim accepted names.
Include accessible error/correction behavior and tests. Preserve the study
snapshot and use the existing dependencies. Do not implement until approved.
```

**4. Implement and verify.** Approve the bounded plan and the tools it needs.
Afterward:

```text
Review the actual diff against the approved name rule.
Run npm run check. Report actual results, failures and limitations.
Do not remove or weaken assertions. Do not change the cohort query or dataset.
```

Show the Julia change and the page change in Source Control. Restart
`npm start`, refresh and try three things: a blank name (inline error, focus
returns to the name, nothing created), `  Demo Coordinator  ` (accepted and shown
trimmed) and a corrected name (the error clears and the keyboard submits). Point
to the API test, which proves that bypassing the browser still fails, and to the
unchanged counts.

**Say:** "The evidence is the inspected diff and the observed checks, not the
agent saying it is done."

**5. Explain.**

```text
From the actual diff and test results, draft a nontechnical business summary,
three acceptance criteria, three test scenarios and a short release note.
Cite evidence. Separate verified behavior from assumptions and remaining
manual checks. Do not describe this synthetic demo as clinically validated.
```

**Close:** "Use existing scientific tools. Agree a small change. Inspect what
Copilot did. Verify the behavior. Explain it to the next person."

If something fails: stop on a setup or data error and never replace library
results with hardcoded counts. If the agent widens the scope, reject the extra
change. Show a failing test and fix the real cause rather than skipping it. If a
Copilot feature is unavailable, say so instead of imitating it. To show a known
good result, open the **reference** folder and label it as the reference, not the
agent's output.

## Review exercise

For a code review demo, in a fresh **reference** folder:

```powershell
$env:GIT_CEILING_DIRECTORIES = Split-Path $PWD.Path
git apply --no-index --ignore-space-change --check docs\fixtures\review-whitespace-regression.patch
git apply --no-index --ignore-space-change docs\fixtures\review-whitespace-regression.patch
npm test
# The whitespace tests fail on purpose. Keep them.
git apply --no-index --ignore-space-change docs\fixtures\review-whitespace-correction.patch
npm run check
```

Copilot may miss the seeded defect, so the failing test is the deterministic
evidence. Report missed findings as well as useful comments.

## GitHub drafts and CI

Everything here is local preparation. Publishing, creating issues or pull
requests, assigning Copilot, requesting a review, running a workflow, changing a
policy and cleaning up hosted resources each need your separate approval.

### Draft an issue and a pull request

```powershell
npm run demo:prepare -- --repo OWNER/REPO --run web-one --scenario w1 --base demo/web-one/base --head demo/web-one/head
```

This writes `issue.md`, `pull-request.md` and `manifest.json` to
`.demo-runs\web-one`. It uses no network and no Git, does not check that the
branches exist, and refuses a reused run name. A prefilled link opens an editable
draft, not a created issue. If the manifest says to paste the body, copy
`issue.md`, because a long link can be cut short. Compare links work only after
the branches are approved and pushed. Issue templates appear in the chooser only
once they are on the default branch, and they do not assign Copilot.

| Scenario | What it is for |
|---|---|
| `w1` | Issue → Copilot coding agent → pull request, from a fresh branch committed from a **start** folder (not the finished app). Confirm the real base before assigning, and stop if you cannot pick it |
| `w2` | A manual Copilot review of the seeded whitespace regression. Keep the failing test, request Copilot under **Reviewers**, and record the comments, including none |
| `w3` | An automatic review from a branch rule. Needs admin approval. Check the effective personal, repository and inherited settings **before** you push, because publishing can trigger a review |

Record the run, repository, starting commit, the branches you proposed and the
ones you observed, issue and pull request numbers, exact commands and results,
and your decisions. Do not auto-merge, force-reset or delete branches in bulk.
Local drafts do not prove that GitHub rendered a template or that Copilot ran.

### CI

`.github/workflows/julia-demo.yml` runs on pull requests or by hand, after you
publish. It pins Julia 1.10.12, Node 22.20.0 and every action by commit. It has
`contents: read`, does not keep checkout credentials and uses no secrets,
deployment or review requests. It installs the pinned dependencies and browser,
fetches the checksum-pinned dataset, then runs `npm run check` and
`npm run scanlab:check`. A deliberately broken **start** or review fixture must
fail there too. Do not change the workflow to hide that. A local pass is not a
hosted run.

Official guides (check them against your account and policy):
[assign work to Copilot](https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/kick-off-a-task),
[Copilot code review](https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/copilot-code-review) and
[configure code review](https://docs.github.com/en/copilot/how-tos/copilot-on-github/set-up-copilot/configure-code-review).

## Boundaries

Synthetic inputs and the one checksum-pinned dataset only. The API exposes
aggregates, not patient rows. There is no authentication, persistence or complete
audit trail. Out of scope: patient import, arbitrary database connections,
FHIR or EHR services, custom scientific algorithms, an AI SDK inside the app, GPU
work and deployment. Copilot access and features depend on your account.
