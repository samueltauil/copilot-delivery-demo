# Worked example: draft for human review

## Business summary

Requesters receive a clear name error before an unnamed request is accepted.

## Five business steps

1. Open the request form.
2. Enter a requester name and optional description.
3. Submit; correct the name if an error is shown.
4. Receive confirmation only after the server accepts the request.
5. See the accepted request in the list.

## User story

As a requester, I want a clear message when my name is missing so I can correct
the request before submitting it.

## Acceptance criteria and scenarios

| Criterion | Scenario | Evidence |
|---|---|---|
| Invalid name creates no request | Submit missing/null/non-string/empty/whitespace input; API returns 400 with the exact message; UI associates/focuses the error | createRequestStore in src/requests.js; invalid-name and whitespace tests in test/server.test.js; accessible-error test in e2e/request-submission.spec.js |
| Valid name is accepted, trimmed and listed | Submit `  Demo Analyst  `; API returns 201 and subsequent list contains `Demo Analyst` | valid-name HTTP test and store Unicode-trimming test; corrected-input browser test |
| Corrected input clears the error and submits | After rejection, enter a valid name; inline error clears, keyboard submission works, confirmation/list update follow server success | accessible-error correction/browser keyboard test |

## Release note

The request form now explains when a requester name is missing and lets the user
correct it. The server also checks names before accepting a request.

## Implemented versus unverified

Implemented: server-authoritative name rule, accessible field association/focus,
success announcement markup, text-only rendering, preserved input on failure.
Automated Chromium assertions cover these interactions, not a full accessibility
audit or actual screen-reader announcement quality. Human accessibility review
and complete interactive harness rehearsals remain separate.

Data is synthetic and in memory; this is not a production release.
The user confirmed this demonstration rule, not a customer production policy.

## Questions for developers/business owners

- What real workflow and required fields should replace the synthetic example?
- What persistence, access, localization and accessibility requirements apply?
- Who approves the real acceptance criteria and owns outcome measurement?

No answers, approvals, ownership, adoption or cost savings have been invented.
