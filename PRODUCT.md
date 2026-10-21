# ScanLab

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Healthcare software engineers and platform leaders evaluating an observable,
bounded GitHub Copilot development workflow.

## Product Purpose

Compute a synthetic acquisition, write and reopen DICOM, pin a reference, and
compare another live acquisition with inspectable evidence.

## Operating Context

Local Julia backend and a shared browser/Copilot app Canvas interface. The app
is the intended presentation entry point; browser checks do not certify the
host app. Local readiness is manually triggered and never repairs failures.

## Capabilities and Constraints

The existing fixed phantom, three CPU motion presets, and maintained scientific
libraries remain authoritative. Every Run computes. DICOM adds an explicitly
synthetic derived image, not a patient study or clinical interpretation.
The separate request-desk exercise and its name-rule task remain unchanged.
No production deployment, arbitrary imports, PACS, AI diagnosis, or hosted
GitHub action is included. Remote actions require separate approval.

## Product Principles

- Images lead; metadata and provenance are inspectable, not decorative.
- Measure encoding error rather than promising lossless floating-point export.
- Keep pinned image data and provenance immutable through later runs or failure.
- Report actual computation, validation, and UI limitations.

## Evidence on Hand

Existing simulation, state, HTTP, Canvas-adapter and browser tests; a pinned
Julia imaging environment; local teaching snapshots. Actual DICOM and host-app
evidence must be established, not inferred from these components.
