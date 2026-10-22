# GitHub Copilot desktop app adapter

## ScanLab: current checkout and existing Canvas

The installed app's workspace picker distinguishes **Current checkout** from
**New worktree**. Selecting **This computer** is not enough: a new worktree uses
committed history and will not contain the uncommitted migration/ScanLab.

1. Add the existing local repository folder, then start a new session.
2. Set **Workspace -> Current checkout**. Verify the actual working directory.
3. Prepare the numerical environment using `npm run scanlab:setup` before
   presenting. Start `npm run scanlab` and wait for its real ready message.
4. Ask: `Open the existing scanlab canvas. Do not scaffold or edit anything.`
5. On a missing extension, use `extensions_reload` once and inspect `scanlab`.
   Read its actual error instead of repeatedly creating another session.
6. Ask Copilot to drive it, or copy a suggested prompt from the page's **Work
   with Copilot** card. The Canvas actions are `get_state`, `select_preset`,
   `run_experiment` (with `waitForResult`), `pin_baseline` ("Keep as reference"
   on the page), `get_comparison` and `get_pr_note`. Each action shows up live in
   the page's **Recent activity** as Copilot's, and the Canvas uses the same
   local API and page as the browser. The label is self-reported display text,
   not security.

The project extension is under `.github/extensions/scanlab`. It uses the
installed host's `@github/copilot-sdk/extension` module resolver; no application
AI SDK installation or secret is needed. It starts computation only when the
Canvas is opened or an action explicitly requests the backend.

When the Canvas attaches to an already-running CLI-owned server, closing the
Canvas does not kill that server. When the Canvas owns the server, its close
handler stops only that process. A failed startup is explicit.

Computer Use can be enabled with the app's documented controls, but the host
may prohibit controlling GitHub Copilot itself. That safety restriction is
not bypassed. A native Canvas action is not a claim of verified GUI clicking.
Actual browser, extension-action, visual and human checks are recorded separately.

Use [the local readiness definition](../scanlab-readiness.md) for a manual-only
automation. It reports checks and failures; it must not auto-edit code or install
dependencies. Cloud automation and publication remain separately approved.

## Request-desk and general adapter

This means the GitHub Copilot app, not GitHub Desktop or Microsoft Copilot.
Verify installed app/version, account policy, selected model, repository access,
and the actual worktree/branch. Do not assume CLI access grants app access.

Use available planning/interactive controls and ordinary docs/prompts. Verify a
read-only role or tool boundary before claiming enforced read-only understanding.
Stop after the plan for human approval; grant only required write/command access.
Inspect the app's surfaced Changes/diff and actual validation output. If command
execution is unavailable, run npm run check in the approved local terminal and
record that distinction.

Verify available usage views rather than promising CLI parity. Shared CLI
foundations do not guarantee identical controls/tools/context or synchronization.
Use the handoff template; if app/policy is unavailable, say so and demonstrate in
a verified primary interface. Never label that substitution an app rehearsal.
Status: documented; app UI and end-to-end interactive path not yet observed.
