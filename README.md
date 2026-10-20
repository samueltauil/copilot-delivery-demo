# ScanLab: a live HLS experiment with GitHub Copilot

The primary presentation is **ScanLab**: run a synthetic imaging experiment,
change a controlled motion preset, and compare the result with a pinned
baseline. Reveal how Copilot helps improve the workflow, then introduce Julia
and the reused KomaMRI/MRIReco libraries.

No patient data, clinical conclusions, generated fake images, or replay mode.
Every Run computes on the local CPU. Start from the
[ScanLab presenter guide](docs/scanlab-guide.md) and
[scientific contract](docs/scanlab-scenario.md).

```powershell
npm ci
npx playwright install chromium
npm run scanlab:setup
npm run scanlab:check
npm run scanlab
```

Use Julia 1.10.12 and Node 22.20+ as below. Imaging dependencies are separately
pinned under `scanlab`; no OMOP dataset is required for ScanLab. Setup and
compilation are pre-presentation steps. The ready URL carries a local session
capability: open it locally and do not publish it.

In GitHub Copilot app choose **Workspace -> Current checkout** to see these
uncommitted files, then open the existing ScanLab Canvas. The browser and Canvas
share the same local run state. The app provides the extension SDK; this repo
does not add a Copilot SDK application dependency or call a model for physics.
See [app setup and limitations](docs/harnesses/copilot-app.md) and the
[manual local readiness task](docs/scanlab-readiness.md).

`npm run check:all` covers both experiences. Stop only the server you own.
No commits, pushes, hosted actions or global permission changes are implied.

## Preserved synthetic research desk

A small HLS delivery story, not a clinical application. A research coordinator
views a synthetic population snapshot and requests a review. Copilot helps the
team understand the workflow, agree a name-validation rule, implement it, test
it, and explain the result.

**Present from [DEMO-GUIDE.md](DEMO-GUIDE.md).** One page, one business change,
one browser tab. GitHub delegation/review/CI are optional continuations of the
same story, not additional applications.

## What is actually reused

- **JuliaHealth HealthSampleData.jl** downloads the checksum-pinned synthetic
  Eunomia SQLite dataset. No patient generator is implemented here.
- **JuliaHealth OMOPCDMCohortCreator.jl** supplies the existing person/cohort
  query functions from its [beginner tutorial](https://juliahealth.org/OMOPCDMCohortCreator.jl/stable/tutorials/beginner_tutorial/).
  No cohort engine, terminology service, or clinical algorithm is reimplemented.
- **HTTP.jl, JSON.jl and SQLite.jl** handle transport, strict JSON and database access.
- The small accessible HTML/JavaScript UI and Playwright checks are retained.
  Node is developer/test tooling only; the application backend is Julia.

The verified snapshot has **2,694 synthetic people** and **1,677 distinct people**
with a condition record for tutorial concept **28060**. Multiple condition
records do not count as multiple people. These are descriptive tutorial counts,
not prevalence estimates, eligibility decisions, diagnoses, or recommendations.
Submitting a request records a coordination task; it does not rerun an analysis
or notify a real person.

## Set up before presenting

Prerequisites: **Julia 1.10.12**, **Node 22.20+**, and Git. Other Julia versions
allowed by the project compatibility range are not automatically certified.
Install Julia using the [official instructions](https://julialang.org/downloads/).
The locally prepared authoring checkout also recognizes its isolated
`.demo-runs\tools\julia-1.10.12\bin\julia.exe`; no global PATH change is needed.
For another installation, set `JULIA_EXE` to the executable.

From the repository root in PowerShell:

```powershell
# Optional, only when Julia is neither on PATH nor in the prepared local location:
# $env:JULIA_EXE = 'C:\path\to\julia\bin\julia.exe'
npm ci
npx playwright install chromium
npm run setup
npm run check
npm start
```

The setup step needs internet access for packages and the synthetic dataset.
Review the DataDeps download/terms prompt and accept it before the audience
joins. Packages default to the isolated `.demo-runs\julia-depot` directory.
`Project.toml` and `Manifest.toml` declare and pin the Julia dependencies.
Do not delete the cache to repeat a demonstration.

Open **http://127.0.0.1:3000**. Stop with Ctrl+C. For another port:
`$env:PORT = '3001'; npm start`. The server is loopback-only and does not reload
code automatically. Restart it after an implementation change.

After setup, the app and checks use cached data and do not download at runtime.
Startup warms the request paths with a disposable synthetic request before
opening the listener, then serves a fresh empty request store.
Missing or changed data stops startup explicitly rather than showing invented
counts. No database service, GPU, AI API key, cloud account, or deployment is needed.

## Validate and repeat

```powershell
npm test            # Node tooling checks + Julia unit/API/real-data checks
npm run test:e2e    # isolated Chromium server, includes accessible correction
npm run check      # both gates
npm run demo:local -- --run rehearsal-one
```

The last command creates fresh **start** and **reference** snapshots under
`.demo-runs\rehearsal-one`, without copying private context, data, dependencies,
or Git history. Start deliberately lacks the name rule; its name tests are
expected to fail. Reference contains the completed implementation. Keep both
test suites intact. Cache/working-directory steps are in
[the repeatability guide](docs/demo-lifecycle.md).

The old `demo-start` and `demo-candidate` Git tags remain untouched **Node-era
history**. They are not the Julia demo. Snapshot names `julia-start` and
`julia-reference` are roles, not claims that new tags or commits exist.

## Boundaries and evidence

Only synthetic inputs and the exact pinned synthetic dataset are permitted.
The API exposes aggregates, not patient rows. Requests are in-memory and reset
on restart; the read-only dataset remains cached. No authentication or complete
audit trail is claimed.

See [scenario](docs/scenario.md), [reuse sources](docs/official-docs-validation.md),
[requirement evidence](docs/requirements-traceability.md), and
[actual rehearsal results](docs/evidence/rehearsal.md).
Package licensing and dataset provenance are documented separately; package
licensing alone is not proof of arbitrary health-data reuse rights.

The Actions workflow is a local, unexecuted hosted-CI definition until separately
approved/published. Do not push, create issues/PRs, assign Copilot, request
reviews, change policies, merge, or clean hosted resources without separate
approval. Copilot access and feature availability depend on the actual account.
