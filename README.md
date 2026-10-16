# Request desk: a controlled Copilot demonstration

Small Node.js API and browser UI, synthetic in-memory data, and evidence-backed
developer/BA exercises. No application AI SDK, database, secrets, or deployment.

**Present from `DEMO-GUIDE.md`.** It is the feature-first, step-by-step script.
The repository is only the supporting prop; setup belongs before the audience.
Official procedure checks and sources are in `docs\official-docs-validation.md`.

## Run locally (PowerShell)

```powershell
npm ci
npx playwright install chromium
npm start
```

Open `http://127.0.0.1:3000`. The app binds loopback only. Stop it with Ctrl+C.
For another port: `$env:PORT = '3001'; npm start`. Restarting clears all requests.
Node.js 22.20 or newer is required; the tested runtime is recorded in
`docs\evidence\rehearsal.md`. Pin and review an approved supported runtime for your
environment rather than assuming any newer version is automatically tested.

## Validate

```powershell
npm test
npm run test:e2e
npm run check
```

Playwright starts/stops its own dedicated loopback server on port 43179 and
refuses to reuse another server. Browser installation is a setup step, not a
live demonstration dependency. There is no build step.

## Present or repeat

Start with `DEMO-GUIDE.md`. Use `docs\facilitator-playbook.md`,
`docs\scenario.md`, `docs\demo-lifecycle.md`, and
`docs\requirements-traceability.md` only as supporting references.
Primary surface guides are under `docs\harnesses`; ordinary portable prompts
are under `docs\prompts`. `docs\web-scenarios.md` covers repeatable web triggers.

The `demo-start` tag is deliberately incomplete:
requester-name validation is missing.
It is local-only, synthetic-data-only, and NOT production-ready.
`demo-candidate` is the validated local reference. `demo-complete` is reserved
until required interactive rehearsals are observed; no production release is
implied. Read `docs\evidence\rehearsal.md` before claiming presentation readiness.
Use unique worktrees/branches; never reset or force-push canonical checkpoints.

Prepare only local web drafts (replace the illustrative repository and run ID):

```powershell
npm run demo:prepare -- --repo example/demo --run rehearsal-one --scenario w1 --base demo/rehearsal-one/base --head demo/rehearsal-one/head
```

Output is ignored under `.demo-runs`. This performs no network, Git, issue,
PR, assignment, review, or policy action. Hosted execution, publication, and
cleanup require separate approval; preparation does not verify branch existence.

Readiness evidence must distinguish local tests from interface rehearsals and
live GitHub execution. No complete audit trail, cost savings, or AI bug-detection
guarantee is claimed.
