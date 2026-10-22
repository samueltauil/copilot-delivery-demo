# ScanLab

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Healthcare software engineers and platform leaders evaluating an observable,
bounded GitHub Copilot development workflow, and the non-specialists in the
room with them. The page must make sense without a medical-imaging vocabulary.

## Product Purpose

In four plain steps (take a scan, keep it as the reference, scan again with
movement, see what changed), compute a synthetic acquisition, write and reopen
it as DICOM, and compare a second live acquisition against the kept reference.
GitHub Copilot is a working partner on the same screen: it suggests prompts,
drives the running service through Canvas actions, and drafts the pull request
evidence. Technical evidence stays one click away.

## Operating Context

Local Julia backend and a shared browser/Copilot app Canvas interface. The app
is the intended presentation entry point; browser checks do not certify the
host app. The page and the Canvas are the same interface on the same running
service, so what Copilot does through the Canvas appears live on the page,
named as Copilot's. Local readiness is manually triggered and never repairs
failures.

## Capabilities and Constraints

The existing fixed phantom, three CPU motion presets, and maintained scientific
libraries remain authoritative. Every Run computes. DICOM adds an explicitly
synthetic derived image, not a patient study or clinical interpretation.
The separate request-desk exercise and its name-rule task remain unchanged.
No production deployment, arbitrary imports, PACS, AI diagnosis, or hosted
GitHub action is included. Remote actions require separate approval.
Actor names in the activity list (You, Copilot, A script) are self-reported
display labels, not authentication or an audit trail.

## Product Principles

- Plain words first. Technical terms live in the closed Technical details and
  the plain-words table in docs/how-it-works.md, never in the way of the first
  read.
- Images lead; metadata and provenance are inspectable, not decorative.
- Every action answers at once: the page shows what is happening before the
  server finishes, and it never passes an old image off as new.
- Measure encoding error rather than promising lossless floating-point export.
- Keep the reference image data and provenance immutable through later runs or
  failure.
- Copilot's work is visible, attributable on the page, and evidence-producing,
  never hidden or replayed.
- Report actual computation, validation, and UI limitations.

## Evidence on Hand

Julia science, state, DICOM and HTTP tests (including a regression that a
running scan never freezes the web server and a check of the startup warm-up),
Node tests for the shared story logic, the Canvas adapter and the teaching
fixture, a Playwright browser suite including a phone layout, a pinned Julia
imaging environment, and local teaching snapshots. Host-app evidence is not
inferred from these: Computer Use is blocked for the Copilot app by the host's
safety policy, so the Canvas is covered by adapter tests and a person must
confirm the host app itself.
