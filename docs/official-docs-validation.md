# Official sources and reuse validation

## JuliaHealth migration: October 18, 2026

The installed, pinned packages were executed locally, not merely read:

| Reused project | Purpose and verified API | Source / limitation |
|---|---|---|
| HealthSampleData.jl 0.0.1 | `Eunomia()` downloads synthetic SQLite data using DataDeps and a checksum | [JuliaHealth repository](https://github.com/JuliaHealth/HealthSampleData.jl); [registered identity](https://github.com/JuliaRegistries/General/tree/master/H/HealthSampleData). MIT package license. Published docs links returned 404 during research. |
| OMOPCDMCohortCreator.jl 0.5.1 | `GenerateDatabaseDetails`, `GenerateTables`, `GetDatabasePersonIDs`, `ConditionFilterPersonIDs` | [Existing tutorial](https://juliahealth.org/OMOPCDMCohortCreator.jl/stable/tutorials/beginner_tutorial/). SQLite support and distinct-person results executed locally. |
| HTTP.jl 1.11.0 | Loopback HTTP server, request parsing and streaming | [Project](https://github.com/JuliaWeb/HTTP.jl). Use the pinned v1 API; current stable web docs also describe newer APIs. |
| SQLite.jl / JSON.jl | Database access and strict JSON parsing/serialization | [SQLite docs](https://juliadatabases.org/SQLite.jl/stable/), [JSON docs](https://juliaio.github.io/JSON.jl/stable/). Exact versions are in the manifest. |

HealthSampleData's default upstream branch had a different UUID from its
registered release. Initial resolution failed; the project now uses the General
registry identity and pinned registered release. No local fork or vendor patch
was used.

The downloaded dataset's SHA-256 is
`cef9f00fe469041cfcdec527fc6f5657e2d0185bc002df38262faa642ee97c82`.
The observed tutorial result is 2,694 distinct people, 1,677 in concept 28060.
`test/study.jl` cross-checks with independent SQL and a repeated-event fixture.
An initial SQL probe incorrectly retained SQLite's forward-only row objects;
the committed test reads values while the row is valid.

Data provenance: HealthSampleData identifies this artifact as synthetic
Synthea-generated Eunomia, not arbitrary public patient data.
[OHDSI Eunomia](https://github.com/OHDSI/Eunomia) manages sample OMOP data;
[EunomiaDatasets](https://github.com/OHDSI/EunomiaDatasets) publishes an Apache-2.0
license. Package licenses do not grant blanket rights to all medical datasets
or terminology. This repo does not redistribute the database or vendor upstream
source. Setup uses the upstream artifact/terms and the exact checksum.

JSON3 was initially evaluated, but a compatibility test proved that its reader
accepted trailing garbage after a valid object. The application uses JSON.jl's
strict root parser instead of implementing a custom JSON validator. The
malformed/trailing/multiple-document/non-finite-number checks remain in the API
suite. Application tests run before snapshot-tooling tests so a deliberate
name regression is reported by the business assertions, not fixture preparation.

DICOM.jl and KomaMRI.jl were considered but excluded: they serve imaging
workflows, not this request/cohort story. No imaging libraries, GPU setup,
Pluto dashboard, FHIR service, or application AI SDK were added.

The [VS Code planning documentation](https://code.visualstudio.com/docs/agents/run/planning)
was rechecked. This demo uses an outcome-first explanation, a reviewed plan,
an inspected implementation and real tests. No particular YouTube video was
verified/watched, and no video-derived execution evidence is claimed.

## Historical product-procedure checks: October 16, 2026

Checked October 16, 2026. This validates product instructions against official
sources, not actual access, feature entitlement, successful live execution,
or identical controls in every installed version. No hosted action was performed.

The earlier flow used VS Code's **Local** harness so Ask, Plan,
and Agent follow one understandable path. The Copilot harness has different
planning controls; do not mix the two action names.

| Ref | Guide steps | Official procedure verified | Official source |
|---|---|---|---|
| D1 | 1 | New chat; select Session Target; Local Ask/Plan/Agent roles; harness differs from model | `https://code.visualstudio.com/docs/agents/run/agent-harnesses` |
| D2 | 2-3 | Local Plan and Start Implementation; Copilot Plan/Implement Plan alternative; scope approval separate from tool approvals | `https://code.visualstudio.com/docs/agents/run/planning` |
| D3 | 3 | Source Control and selecting changed files to review diffs | `https://code.visualstudio.com/docs/sourcecontrol/overview` |
| D4 | 5 | Issue Assignees -> Copilot, optional base selection, assignment creates PR; issue comments received at assignment | `https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/kick-off-a-task` |
| D5 | 6 | PR Reviewers -> Request; actual comments; Fix with Copilot; manual re-review unless new-push review configured | `https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/copilot-code-review` |
| D6 | 7 | Repository branch ruleset with automatic Copilot review; Active, targets, new pushes and drafts; approval required before saving | `https://docs.github.com/en/copilot/how-tos/copilot-on-github/set-up-copilot/configure-code-review` |
| D7 | 8, CLI | Installed official CLI help confirmed /plan, /permissions, /diff, /context, /usage; /ask is a side question | `https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference` plus installed CLI 1.0.99-2 help |
| D8 | 8 | Spending reports, budgets and enforcement settings differ from local session signals; admin verification needed | `https://docs.github.com/en/copilot/how-tos/manage-and-track-spending/manage-company-spending` |
| D9 | App alternative | Add local project, session mode, Interactive, Changes; separate app policy; /plan supported | `https://docs.github.com/en/copilot/get-started/quickstart-copilot-app` and `https://docs.github.com/en/copilot/reference/github-copilot-app-reference/slash-commands` |
| D10 | Mobile alternative | Available surface for Copilot questions away from the workstation; choose surface for the task | `https://docs.github.com/en/copilot/get-started/where-to-use-github-copilot` |
| D11 | Web preflight | Issue query/template parameters prepare content; chooser uses templates on default branch | `https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-an-issue` and `https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository` |

Business-facing prompts, the sample form, local commands, and the required-field
contract are this demonstration's content, not features guaranteed by those docs.
Their executable evidence is in `docs\evidence\rehearsal.md`.

Git worktree/restore semantics were also checked against official
`https://git-scm.com/docs/git-worktree` and
`https://git-scm.com/docs/git-restore`. The legacy checkpoint tags
belong to the Node-era history. Current Julia repetitions use prepared snapshots
and do not create or move tags.

## Honest delivery checks

- Ask and Plan controls must actually be present; do not relabel a write-enabled
  agent as read-only because of a prompt.
- Review comments can miss defects. Do not promise a particular finding,
  automatic human-equivalent approval, or completion speed.
- Drafts, ruleset descriptions, and local fixture checks are not live web results.
- Code/docs source checks do not establish app or VS Code interactive rehearsal,
  real screen-reader quality, tenant telemetry, or cost savings.
- If a control is unavailable, state the limitation rather than improvising a
  different trigger while claiming the documented one was demonstrated.
