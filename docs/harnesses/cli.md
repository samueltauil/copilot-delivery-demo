# Copilot CLI adapter

## ScanLab from CLI

Keep `npm run scanlab` running in one terminal. In another, launch `copilot`
from the same checkout. The app's Computer Use self-control restrictions still
apply; CLI is not a workaround for a blocked desktop application.

Use the deterministic command bridge if native Canvas tools are not exposed
by the installed CLI:

```powershell
npm run scanlab:control -- state
npm run scanlab:control -- run still
npm run scanlab:control -- state
# After status is succeeded, use the actual returned result ID:
npm run scanlab:control -- pin ACTUAL_RUN_ID
npm run scanlab:control -- run gentle
npm run scanlab:control -- state
```

The bridge accepts only known commands/presets, uses the existing service's
capability internally, and prints run IDs/hashes rather than that capability.
It neither starts another simulator nor replays results. Poll until completion;
do not pin a running or stale result.

Suggested agent prompt:

```text
Use only node scripts/scanlab-control.js to inspect the active ScanLab session,
run still, wait for completion, pin the completed run ID, run gentle, and verify
the baseline ID and result hash remain unchanged. Do not edit, install, publish,
control desktop applications, or print tokens. Report actual results.
```

Grant only this command family through the CLI's actual tool controls. A
successful CLI run verifies shared-service orchestration, not app GUI clicking.
The app/browser can independently display the same session's state.

Start in the isolated demo worktree with an approved account. Record /version,
model, permissions, and relevant installed /help output before presenting.
Verified help in the authoring session exposed /plan, /permissions, /diff,
/context and /usage. Verify again on the destination version.

For understanding, establish real read-only restrictions if available; otherwise
use verified VS Code Ask or a supplied-file-only explanation and explicitly state
the restriction. /ask is a side-question feature, not universal enforced Ask mode.

Use /plan and docs/prompts/plan.md; stop for human scope approval. Implement only
that scope using narrowly permitted actions. Inspect /diff and git diff, then
run npm run check and record actual exit status/output. Tool approval is separate
from approving a plan. No allow-all mode or remote delegation is required.

/context and /usage show session signals, not authoritative enterprise cost.
Use docs/governance-and-usage.md for reporting boundaries. On failure, stop and
inspect the bounded change rather than resetting unrelated work.
Status: local authoring/commands are recorded; no second interactive session
rehearsal is implied by the existence of this guide.
