# Requirement to evidence

Runtime implementation candidate: 6713e7f. Evidence status is recorded separately
in docs/evidence/rehearsal.md; a path is not itself proof of execution.

| Requirement | Implementation / artifact | Automated or observed evidence |
|---|---|---|
| Missing/null/non-string/empty/whitespace names reject without mutation | src/requests.js:createRequestStore/create and src/server.js InputError handling | test/requests.test.js invalid-name matrix; test/server.test.js invalid-name and whitespace regression tests |
| Exact field/error/status | server JSON error handling and public/app.js:setNameError | API deep equality and browser exact-message/aria/focus assertions |
| Valid names trimmed, accepted, listed | request creation and GET/POST routing | store Unicode case, HTTP valid-name test and browser correction test |
| Optional description, bad payload/media/body errors | store.create, server.parseBody and routing | baseline store test; transport tests (400/405/413/415), no mutation |
| Store isolation and unique server IDs | createRequestStore and createApp factories | store copy/isolation/ID test; per-test ephemeral server instances |
| Static routes, text rendering, explicit unexpected errors | fixed asset map, textContent, logged HTTP 500 | asset/method tests, unexpected-error logger test, literal HTML browser test |
| Accessible error/correction and keyboard flow | public/index.html labels/status, app.setNameError | browser blank/correction/focus/Tab/Enter test; human screen-reader pass still needed |
| Network/server failures preserve input, no false success | app.readResponse and submit catch | browser network-failure and server-field-error tests |
| Small controlled before/after | demo-start 39d7a6c; approved change in docs/approved-change.md | initial 10-test/3-browser baseline; four expected red rule tests, then 14/5 green |
| Reusable BA artifacts | docs/ba/templates.md and worked-example.md | human approval of real production policy not claimed |
| Interface-independent prompts and handoff | docs/prompts, docs/handoff-template.md, docs/harnesses | authoring CLI evidence only; VS Code/app interactive paths not rehearsed |
| Repeatable web drafts/templates | scripts/prepare-web-demo.js, .github issue/PR templates | test/prepare-web-demo.test.js plus two run IDs; no network/Git mutation |
| Manual/automatic review scenarios | docs/web-scenarios.md and isolated fixture patches | local fixture failure/correction replay; hosted triggers not executed |
| Governance and cost honesty | docs/governance-and-usage.md | no tenant access or invented metrics; separate admin verification needed |
| Full source-brief coverage | docs/facilitator-playbook.md coverage matrix C01-C45 | eight slide cards, seven prompts, explicit appendix/deferred dispositions |

The presenter must distinguish observed tests from proposed remote actions,
remaining manual accessibility work, and unobserved interface compatibility.
