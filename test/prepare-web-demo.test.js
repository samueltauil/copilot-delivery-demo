import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { issueLink, prepareWebDemo } from '../scripts/prepare-web-demo.js';

const options = { repo: 'example/demo', run: 'run-one', scenario: 'w1', base: 'demo/run-one/base', head: 'demo/run-one/head' };

async function rootFor(t) {
  const root = await mkdtemp(join(tmpdir(), 'copilot-drafts-'));
  t.after(() => rm(root, { recursive: true }));
  return root;
}

test('prepares isolated local drafts for every scenario without remote claims', async (t) => {
  const root = await rootFor(t);
  for (const scenario of ['w1', 'w2', 'w3']) {
    const { directory, manifest } = await prepareWebDemo({ ...options, run: `run-${scenario}`, scenario }, root);
    assert.equal(manifest.state, 'prepared-local');
    assert.equal(manifest.issue, null);
    assert.equal(manifest.startingSha, null);
    assert.deepEqual(manifest.observed, []);
    assert.equal(JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8')).run, `run-${scenario}`);
    assert.match(await readFile(join(directory, 'issue.md'), 'utf8'), /No automatic assignment/);
    assert.match(await readFile(join(directory, 'pull-request.md'), 'utf8'), /NOT RUN/);
  }
  assert.equal((await readdir(join(root, '.demo-runs'))).length, 3);
  await assert.rejects(prepareWebDemo({ ...options, run: 'run-w1' }, root), { code: 'EEXIST' });
});

test('rejects missing/unsafe inputs before creating any files', async (t) => {
  const root = await rootFor(t);
  const invalid = [
    { repo: '../outside' }, { run: '../escape' }, { run: '' }, { run: 'CON\\outside' },
    { scenario: 'w4' }, { base: 'ref..bad' }, { head: 'demo//head' }, { head: 'bad.lock' },
    { head: options.base }, { head: undefined }, { base: '@{bad}' }
  ];
  for (const changes of invalid) await assert.rejects(prepareWebDemo({ ...options, ...changes }, root));
  assert.deepEqual(await readdir(root), []);
});

test('encodes issue data and provides bounded-link copy-body fallback', () => {
  const title = 'Name & review?';
  const body = 'Whitespace: "   "\nUnicode: \u00e9';
  const full = issueLink(options.repo, title, body, '01-validation-task.md');
  assert.equal(new URL(full.url).searchParams.get('title'), title);
  assert.equal(new URL(full.url).searchParams.get('body'), body);
  assert.equal(full.copyBody, false);
  const short = issueLink(options.repo, title, 'x'.repeat(5000), '01-validation-task.md');
  assert.equal(short.copyBody, true);
  assert.equal(new URL(short.url).searchParams.has('body'), false);
  assert.ok(short.url.length <= 2000);
});

test('issue templates contain required draft sections and no automatic assignee', async () => {
  for (const name of ['01-validation-task.md', '02-review-exercise.md']) {
    const text = await readFile(new URL(`../.github/ISSUE_TEMPLATE/${name}`, import.meta.url), 'utf8');
    assert.match(text, /^---\r?\nname:/);
    assert.match(text, /## Acceptance/);
    assert.match(text, /## Approval/);
    assert.doesNotMatch(text, /^assignees:/m);
  }
  const pr = await readFile(new URL('../.github/PULL_REQUEST_TEMPLATE.md', import.meta.url), 'utf8');
  assert.match(pr, /Validation/);
  assert.match(pr, /Reviewers/);
});
