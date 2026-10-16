# Official documentation validation

Checked October 16, 2026. This validates product instructions against official
sources, not actual access, feature entitlement, successful live execution,
or identical controls in every installed version. No hosted action was performed.

The starting flow deliberately uses VS Code's **Local** harness so Ask, Plan,
and Agent follow one understandable path. The Copilot harness has different
planning controls; do not mix the two action names.

| Ref | Guide steps | Official procedure verified | Official source |
|---|---|---|---|
| D1 | 1 | New chat; select Session Target; Local Ask/Plan/Agent roles; harness differs from model | `https://code.visualstudio.com/docs/agents/run/agent-harnesses` |
| D2 | 2-3 | Local Plan and Start Implementation; Copilot Plan/Implement Plan alternative; scope approval separate from tool approvals | `https://code.visualstudio.com/docs/agents/run/planning` |
| D3 | 3 | Source Control and selecting changed files to review diffs | `https://code.visualstudio.com/docs/sourcecontrol/overview` |
| D4 | 5 | Issue Assignees -> Copilot, optional base selection, assignment creates PR; issue comments received at assignment | `https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/kick-off-a-task` |
| D5 | 6 | PR Reviewers -> Request; actual comments; Fix with Copilot; manual re-review unless new-push review configured | `https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/copilot-code-review` |
| D6 | 7 | Repository branch ruleset with automatic Copilot review; Active, targets, new pushes and drafts; approval required before saving | `https://docs.github.com/en/copilot/how-tos/copilot-on-github/set-up-copilot/configure-code-review` |
| D7 | 8, CLI | Installed official CLI help confirmed /plan, /permissions, /diff, /context, /usage; /ask is a side question | `https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference` plus installed CLI 1.0.99-2 help |
| D8 | 8 | Spending reports, budgets and enforcement settings differ from local session signals; admin verification needed | `https://docs.github.com/en/copilot/how-tos/manage-and-track-spending/manage-company-spending` |
| D9 | App alternative | Add local project, session mode, Interactive, Changes; separate app policy; /plan supported | `https://docs.github.com/en/copilot/get-started/quickstart-copilot-app` and `https://docs.github.com/en/copilot/reference/github-copilot-app-reference/slash-commands` |
| D10 | Mobile alternative | Available surface for Copilot questions away from the workstation; choose surface for the task | `https://docs.github.com/en/copilot/get-started/where-to-use-github-copilot` |
| D11 | Web preflight | Issue query/template parameters prepare content; chooser uses templates on default branch | `https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-an-issue` and `https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository` |

Business-facing prompts, the sample form, local commands, and the required-field
contract are this demonstration's content, not features guaranteed by those docs.
Their executable evidence is in `docs\evidence\rehearsal.md`.

Git worktree/restore semantics were also checked against official
`https://git-scm.com/docs/git-worktree` and
`https://git-scm.com/docs/git-restore`. The checkpoint tags
are created locally by the repository history itself.

## Honest delivery checks

- Ask and Plan controls must actually be present; do not relabel a write-enabled
  agent as read-only because of a prompt.
- Review comments can miss defects. Do not promise a particular finding,
  automatic human-equivalent approval, or completion speed.
- Drafts, ruleset descriptions, and local fixture checks are not live web results.
- Code/docs source checks do not establish app or VS Code interactive rehearsal,
  real screen-reader quality, tenant telemetry, or cost savings.
- If a control is unavailable, state the limitation rather than improvising a
  different trigger while claiming the documented one was demonstrated.
