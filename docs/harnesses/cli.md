# Copilot CLI adapter

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
