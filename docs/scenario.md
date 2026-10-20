# Scenario and business contract

This file describes the preserved request-desk exercise. [ScanLab](scanlab-scenario.md)
is a separately approved live-only imaging experience; its numerical feasibility and actual
Copilot app integration must be verified before claiming presentation readiness.
The request-desk contracts below remain unchanged.

A research coordinator views a verified synthetic study snapshot, enters an
invented requester name and optional description, and requests a review.
The accepted request is a local coordination record; it does not contact anyone,
rerun the analysis, establish identity, or make a clinical decision.

## Existing-library context

HealthSampleData.jl supplies synthetic Eunomia. OMOPCDMCohortCreator.jl supplies
the existing person/cohort functions for tutorial concept 28060. The Julia
backend computes one aggregate-only snapshot before accepting connections:

```json
{"study":{"dataset":"Eunomia","synthetic":true,"conditionConceptId":28060,"condition":"Strep throat (tutorial cohort)","totalPeople":2694,"cohortPeople":1677}}
```

`GET /api/study` returns that object. Count distinct people, not repeated
condition records. The fixed dataset checksum is verified before opening the
database. Missing/changed data fails startup; a study fetch failure hides the
counts and leaves submission disabled with an explicit message. No patient rows
or query-building endpoint are exposed.

## The one live implementation task

Missing, null, non-string, empty, or whitespace-only `requesterName` returns
HTTP 400 with:

```json
{"error":{"field":"requesterName","message":"Requester name is required."}}
```

Create nothing on rejection. Trim valid names consistently with the browser;
return HTTP 201 with
`{"request":{"id":"server-generated","requesterName":"trimmed","description":""}}`.
`GET /api/requests` returns `{"requests":[]}` or the accepted requests.
Description is optional text; non-string descriptions are rejected.

The UI associates inline errors with the name field, focuses it, preserves
values on failure, clears stale errors after correction, announces success,
and displays only server-accepted data as text. The API enforces the rule
independently. Request data resets when the server restarts.

Acceptance: invalid creates nothing; valid is trimmed/accepted/listed; corrected
input clears the accessible error and submits. Preserve the study snapshot,
16 KiB body limit, status codes, fixed asset routes and explicit failures.

## Checkpoints and non-goals

`npm run demo:local -- --run RUN` prepares Julia `start` and `reference`
snapshots. Start deliberately omits name validation and its UI feedback.
The unchanged name tests are deliberately failing evidence, not tests to delete.
Reference is the completed version. These roles are not Git tags.
The immutable `demo-start`/`demo-candidate` tags are legacy Node history.

Synthetic data only. Non-goals: authentication, request persistence, arbitrary
database connections, patient import, production/clinical use, FHIR/EHR services,
custom scientific algorithms, application AI SDK/runtime, GPU work, deployment,
or unrelated refactors. Any hosted GitHub action requires separate approval.
