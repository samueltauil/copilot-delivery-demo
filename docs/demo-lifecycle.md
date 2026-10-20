# Repeat without destroying evidence

For ScanLab, use `npm run demo:local -- --run RUN --exercise scanlab` and follow
[the ScanLab repeat steps](scanlab-guide.md#repeat). It removes only comparison
behavior in start, not the science. The default command remains the request
desk described below.

The old `demo-start` and `demo-candidate` tags are immutable Node-era history.
Do not move them or call them Julia checkpoints. No `demo-complete` readiness
claim is made.

The Julia demo uses fresh **start/reference snapshots** copied from the current
working files, including uncommitted authoring changes. Only an explicit
allowlist is copied; private context, caches, dependencies, Git history and
previous runs are excluded. Both snapshots keep every test. Their role names
`julia-start` and `julia-reference` are not Git refs.

## Prepare a run before the audience joins

First run root setup and `npm run check`. Then, from the root in PowerShell:

```powershell
$demoRoot = $PWD.Path
$env:JULIA_DEPOT_PATH = Join-Path $demoRoot '.demo-runs\julia-depot'
$env:DEMO_DATA_PATH = Join-Path $demoRoot '.demo-runs\data\Eunomia\eunomia.sqlite'
# If using the isolated runtime prepared in this authoring checkout:
$env:JULIA_EXE = Join-Path $demoRoot '.demo-runs\tools\julia-1.10.12\bin\julia.exe'
# Otherwise use your installed Julia on PATH or set JULIA_EXE to its real executable.

npm run demo:local -- --run presenter-one
Set-Location .demo-runs\presenter-one\reference
npm ci
npm run check
Set-Location ..\start
npm ci
npm start
```

Use a new run name every time. Stop if a command fails or the run directory
exists. Do not overwrite, force-remove, reset, or repurpose someone else's run.
The snapshots share the verified data/package cache through these environment
variables; they do not need a second dataset download.

In another terminal with the same environment variables and start directory,
`npm test` is **expected to fail name assertions before implementation**.
`npm run test:e2e` also exposes the missing name-specific UI behavior.
The reference must pass. Treat any other failure as a real setup problem.

For Source Control diffs in VS Code, initialize a local baseline **inside the
start snapshot only**, before the audience joins:

```powershell
git init
git add .
git commit -m "Local synthetic Julia starting snapshot" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
code -n .
```

Review staged files before committing. Use your configured local Git identity;
do not alter global identity or add a remote as a setup shortcut. The preparation
script itself creates no repository, commits, branches, tags or hosted resources.

After the approved implementation, run `npm run check`, stop/restart your own
server, and exercise blank, valid and corrected submissions.

## Rehearse a deterministic correction

For a fixture-only rehearsal, not a claimed Copilot implementation, inside an
untouched start snapshot:

```powershell
$env:GIT_CEILING_DIRECTORIES = Split-Path $PWD.Path
git apply --no-index --ignore-space-change --check --reverse docs\fixtures\julia-start.patch
git apply --no-index --ignore-space-change --reverse docs\fixtures\julia-start.patch
npm run check
```

Never apply this after an agent has already changed the same code. Keep the
original failures and correction results labeled as fixture evidence.
The ceiling prevents Git from discovering the parent authoring repository when
the snapshot has not been initialized as its own repository. Without it, Git
can report success while skipping patches inside an ignored nested directory.
The preparation helper sets this boundary itself and checks that code changed.

## Review extension

In a fresh reference snapshot:

```powershell
$env:GIT_CEILING_DIRECTORIES = Split-Path $PWD.Path
git apply --no-index --ignore-space-change --check docs\fixtures\review-whitespace-regression.patch
git apply --no-index --ignore-space-change docs\fixtures\review-whitespace-regression.patch
npm test
# Expected name/whitespace failures; retain the tests.
git apply --no-index --ignore-space-change docs\fixtures\review-whitespace-correction.patch
npm run check
```

For approved GitHub use, commit the selected snapshot to a fresh actual base
branch, record its SHA, and obtain separate publication/agent/review permission.
A draft manifest cannot verify that branch exists remotely. Existing Node-era
hosted issues/PRs are not part of this Julia run and must not be altered.

Retain the run manifest and actual outcomes. Stop only your own processes.
Cleanup must target a specifically identified run, never all of `.demo-runs`;
that directory also holds the reusable runtime, package and data caches.
