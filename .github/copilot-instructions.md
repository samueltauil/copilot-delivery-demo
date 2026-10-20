# Scoped local demonstration

Use synthetic data only. This is a learning application, not a production system.
The ignored context folder is original private planning input, not demo material.
Do not read it, attach it to prompts, or add it to Git.
Read docs/scenario.md and docs/approved-change.md before editing. The prepared
Julia start snapshot deliberately omits the name rule; reference includes it.
The immutable demo-start/demo-candidate Git tags are legacy Node history.

Plan before implementation and require human approval. The approved ScanLab
expansion adds a live-only synthetic imaging experiment, shared browser/Canvas
experience, local readiness workflow, and related tests/documentation.
Preserve the request desk as a separate exercise; its live task remains only
the request-name rule. No unrelated refactors, dependencies, customer data,
deployments, or broad permission changes.
Instructions guide behavior; actual tool permissions must be checked separately.

Reuse the pinned JuliaHealth/HTTP/SQLite libraries. Do not recreate a cohort
engine, data generator or clinical algorithm. Never substitute hardcoded outputs
for failed library calls. The request desk permits only its checksum-pinned
synthetic dataset. ScanLab permits only its fixed synthetic phantom and three
CPU motion presets; every Run must compute, never replay a saved result.
The application backend is Julia; Node is developer/browser-test tooling.

Commands: npm run setup (before presenting), npm start, npm test,
npm run test:e2e, npm run check, npm run demo:local -- --run RUN.
Tests use synthetic data and isolated local servers. Report actual failures;
never skip/weaken assertions to create a passing demonstration.

Do not push, create/modify issues or PRs, assign Copilot, request review,
change GitHub policies, merge, or clean hosted resources without separate approval.
Local draft preparation is not permission for any remote action.
