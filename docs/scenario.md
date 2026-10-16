# Scenario and business contract

A requester opens the form, enters a name and optional description, submits,
receives a clear result, and sees the accepted request in the list.

Target rule: missing, null, non-string, empty, or whitespace-only requesterName
returns HTTP 400 with:

```json
{"error":{"field":"requesterName","message":"Requester name is required."}}
```

Create nothing on rejection. Trim valid names; return HTTP 201 with
`{"request":{"id":"server-generated","requesterName":"trimmed","description":""}}`.
`GET /api/requests` returns `{"requests":[]}` or the accepted requests.
Description is optional text; non-string descriptions are rejected.

The UI associates inline errors with the name field, focuses it, preserves values
on failure, clears stale errors after correction, announces success, and displays
only server-accepted data as text. The API enforces the rule independently.

Acceptance: invalid creates nothing; valid is trimmed/accepted/listed; corrected
input clears the accessible error and submits.

demo-start intentionally lacks this name rule and its name-specific UI behavior.
Existing baseline tests do not certify the missing requirement. demo-complete is
the finished reference. Use synthetic data only; data resets on restart.

Non-goals: auth, persistence, AI SDK/runtime, external data sources, production,
cloud provisioning, architecture recommendations, or unrelated refactors.
