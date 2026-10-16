import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

function validRef(value) {
  return typeof value === 'string' && value.length <= 128 &&
    /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(value) &&
    !value.includes('..') && !value.includes('//') &&
    !value.split('/').some((part) => !part || part.startsWith('.') || part.endsWith('.') || part.endsWith('.lock'));
}

export function issueLink(repo, title, body, template, limit = 2000) {
  const url = new URL(`https://github.com/${repo}/issues/new`);
  url.searchParams.set('template', template);
  url.searchParams.set('title', title);
  url.searchParams.set('body', body);
  if (url.href.length > limit) {
    url.searchParams.delete('body');
    return { url: url.href, copyBody: true };
  }
  return { url: url.href, copyBody: false };
}

export async function prepareWebDemo(options, root = join(dirname(fileURLToPath(import.meta.url)), '..')) {
  const { repo, run, scenario, base, head } = options;
  if (typeof repo !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(repo)) {
    throw new Error('Use --repo OWNER/REPO with ordinary GitHub names.');
  }
  if (typeof run !== 'string' || !/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(run)) {
    throw new Error('Use a unique --run of 1-40 lowercase letters, digits, or internal hyphens.');
  }
  if (!['w1', 'w2', 'w3'].includes(scenario)) throw new Error('Use --scenario w1, w2, or w3.');
  if (!validRef(base) || !validRef(head) || base === head) throw new Error('Use distinct valid --base and --head refs.');
  const implementation = scenario === 'w1';
  const title = `[demo ${run}] ${implementation ? 'Require requester name' : 'Review whitespace validation regression'}`;
  const body = [
    `## Run\n${run} / ${scenario}\nBase: ${base}\nHead (proposed): ${head}`,
    `## Starting point\n${implementation ? 'demo-start' : 'demo-candidate + isolated review fixture'}; record the actual SHA before execution.`,
    '## Business rule\nReject missing, null, non-string, empty, or whitespace-only requesterName with HTTP 400 and "Requester name is required."; create nothing. Trim valid names; accept with HTTP 201.',
    '## Scope\nRequest store/server, accessible name feedback, and tests only. No unrelated refactors, dependencies, publication, policy changes, or merge.',
    '## Acceptance\nInvalid creates nothing. Valid is trimmed and listed. Corrected input clears the accessible error and submits.',
    '## Validation\nnpm test\nnpm run test:e2e\nnpm run check',
    '## Approval\nDraft only. Human must approve publication and each agent/review trigger separately. No automatic assignment.',
    implementation ? '## Stop\nConfirm the selected starting/base branch before assigning Copilot.' :
      '## Review\nPreserve the failing whitespace test; request Copilot through PR Reviewers (w2) or the separately approved automatic policy (w3). No guaranteed finding.'
  ].join('\n\n');
  const template = implementation ? '01-validation-task.md' : '02-review-exercise.md';
  const draft = issueLink(repo, title, body, template);
  const prBody = `# ${title}\n\nScenario: ${scenario}\nRun: ${run}\nBase: ${base}\nHead: ${head}\n\nIssue: NOT CREATED\nApproval: NOT RECORDED\nValidation: NOT RUN\nReview: NOT REQUESTED\n\nUse .github/PULL_REQUEST_TEMPLATE.md. Human must verify the refs and approve each remote action. Do not merge into canonical checkpoints.\n`;
  const manifest = {
    run, scenario, repo, base, head,
    startingCheckpoint: implementation ? 'demo-start' : 'demo-candidate',
    startingSha: null,
    state: 'prepared-local',
    issue: null, pullRequest: null, reviewedCommit: null, approvals: [],
    observed: [],
    supportedStates: ['prepared-local', 'published', 'agent-started', 'review-requested', 'observed', 'closed'],
    issueDraftUrl: draft.url,
    issueBodyMustBePasted: draft.copyBody,
    compareDraftUrl: `https://github.com/${repo}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}?expand=1`,
    warning: 'No network/Git actions were performed. Refs, permissions, and policies were not checked.'
  };
  const parent = join(root, '.demo-runs');
  await mkdir(parent, { recursive: true });
  const directory = join(parent, run);
  await mkdir(directory);
  await Promise.all([
    writeFile(join(directory, 'issue.md'), `# ${title}\n\n${body}\n`, { flag: 'wx' }),
    writeFile(join(directory, 'pull-request.md'), prBody, { flag: 'wx' }),
    writeFile(join(directory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' })
  ]);
  return { directory, manifest };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    const args = process.argv.slice(2);
    const options = {};
    for (let index = 0; index < args.length; index += 2) {
      const key = args[index]?.slice(2);
      if (!args[index]?.startsWith('--') || !['repo', 'run', 'scenario', 'base', 'head'].includes(key) ||
          !args[index + 1] || options[key] !== undefined) {
        throw new Error('Usage: npm run demo:prepare -- --repo OWNER/REPO --run RUN --scenario w1|w2|w3 --base REF --head REF');
      }
      options[key] = args[index + 1];
    }
    const result = await prepareWebDemo(options);
    console.log(`Prepared local drafts: ${result.directory}\nNo GitHub action was performed.`);
  } catch (error) {
    console.error(`Preparation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
