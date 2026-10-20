import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { applyFixture, prepareLocalDemo } from '../scripts/prepare-local-demo.js';

test('prepares isolated Julia snapshots and restores the exact teaching change', async (t) => {
  const runs = fileURLToPath(new URL('../.demo-runs/', import.meta.url));
  await mkdir(runs, { recursive: true });
  const root = await mkdtemp(join(runs, 'snapshot-test-'));
  t.after(() => rm(root, { recursive: true, maxRetries: 5, retryDelay: 100 }));
  const directory = await prepareLocalDemo('test-one', root);
  const start = join(directory, 'start');
  const reference = join(directory, 'reference');
  const entries = await readdir(start);
  for (const excluded of ['context', 'node_modules', '.git', '.demo-runs']) assert.ok(!entries.includes(excluded));
  assert.equal(JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8')).state, 'prepared-local');
  const requestSource = await readFile(join(start, 'src', 'requests.jl'), 'utf8');
  assert.doesNotMatch(requestSource, /throw\(InputError\("Requester name is required/);
  assert.match(await readFile(join(reference, 'src', 'requests.jl'), 'utf8'), /throw\(InputError\("Requester name is required/);
  assert.equal(await readFile(join(start, 'test', 'requests.jl'), 'utf8'), await readFile(join(reference, 'test', 'requests.jl'), 'utf8'));
  const repeated = spawnSync(process.execPath, [join(start, 'scripts', 'prepare-local-demo.js'), '--run', 'from-start'], {
    cwd: start, encoding: 'utf8'
  });
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.equal(JSON.parse(await readFile(join(start, '.demo-runs', 'from-start', 'manifest.json'), 'utf8')).sourceRole, 'julia-start');
  const fixture = join(start, 'docs', 'fixtures', 'julia-start.patch');
  applyFixture(start, fixture, { reverse: true, check: true });
  applyFixture(start, fixture, { reverse: true });
  for (const file of [['src', 'requests.jl'], ['public', 'app.js'], ['public', 'index.html']]) {
    const normalize = (text) => text.replaceAll('\r\n', '\n');
    assert.equal(normalize(await readFile(join(start, ...file), 'utf8')), normalize(await readFile(join(reference, ...file), 'utf8')));
  }
  applyFixture(reference, join(reference, 'docs', 'fixtures', 'review-whitespace-regression.patch'));
  assert.match(await readFile(join(reference, 'src', 'requests.jl'), 'utf8'), /isempty\(name\)/);
  applyFixture(reference, join(reference, 'docs', 'fixtures', 'review-whitespace-correction.patch'));
  assert.equal((await readFile(join(reference, 'src', 'requests.jl'), 'utf8')).replaceAll('\r\n', '\n'),
    (await readFile(join(start, 'src', 'requests.jl'), 'utf8')).replaceAll('\r\n', '\n'));
  await assert.rejects(prepareLocalDemo('test-one', root), { code: 'EEXIST' });
});

test('rejects unsafe local run names before writing', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'julia-demo-'));
  t.after(() => rm(root, { recursive: true, maxRetries: 5, retryDelay: 100 }));
  for (const run of ['', '../escape', 'bad\\path', 'with space', undefined]) {
    await assert.rejects(prepareLocalDemo(run, root), /unique --run/);
  }
  assert.deepEqual(await readdir(root), []);
});
