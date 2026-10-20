# Requirement to evidence

Paths identify executable checks, not proof that they ran. Actual results are
recorded in [rehearsal.md](evidence/rehearsal.md).

| Requirement | Implementation | Evidence |
|---|---|---|
| Reuse JuliaHealth rather than recreate scientific tools | `scripts/setup.jl`, `src/study.jl` | Actual HealthSampleData download and OCC person/cohort helper integration |
| Synthetic data only; missing/changed input fails | Dataset SHA-256 check before SQLite opens | `test/study.jl`: missing file is not created, invalid file rejected, real dataset hash preserved |
| Distinct people, not condition events | Existing OCC cohort helper, aggregate-only snapshot | Tiny repeated-event fixture gives 2 of 3; pinned dataset gives 1,677 of 2,694; independent SQL cross-check |
| No fabricated results on frontend failure | `public/app.js` study fetch/shape check | `e2e/study.spec.js`: network, server and malformed-response cases |
| Name matrix rejects with exact status/error and no mutation | `src/requests.jl`, `src/server.jl` | `test/requests.jl`, `test/server.jl`: missing/null/non-string/blank/Unicode cases |
| Valid name trimmed and listed, unique server ID | Request store and GET/POST handlers | Store identity/isolation checks, exact HTTP response shape, browser correction |
| Accessible inline error/focus and keyboard correction | `public/index.html`, `public/app.js` | Original five `e2e/request-submission.spec.js` checks retained |
| Description/transport behavior preserved | Input validation and HTTP.jl adapter | Tests for 400/405/413/415, exact field errors, 16 KiB bound, chunked requests |
| Fixed assets, literal text, explicit failures | Asset allowlist, `textContent`, logged 500 | API route/header checks, original HTML rendering and network-failure tests |
| Repeatable before/after without checkpoint mutation | `scripts/prepare-local-demo.js`, Julia fixture | `test/prepare-local-demo.test.js`: exclusions, unchanged tests, reverse-patch equality, unsafe/reused run rejection |
| Local-only GitHub preparation | `scripts/prepare-web-demo.js`, issue/PR templates | `test/prepare-web-demo.test.js`; manifests start with no hosted observations |
| Same checks in CI | `.github/workflows/julia-demo.yml` | Pinned actions and local command parity; hosted run requires separate approval/evidence |
| Small BA handoff | `docs/ba/worked-example.md`, prompt cards | Human-reviewed draft criteria linked to tests; no clinical approval claimed |

The old Node assertions were migrated to Julia or retained in Playwright;
the old implementation is available in immutable Git history, not duplicated
as a second runtime in the new app.
