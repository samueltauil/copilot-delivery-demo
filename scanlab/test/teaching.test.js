import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { applyFixture, prepareLocalDemo } from '../../scripts/prepare-local-demo.js';

test('ScanLab teaching omits comparison only, retains science/tests, and restores exactly', async (t) => {
  const runs = fileURLToPath(new URL('../../.demo-runs/', import.meta.url));
  await mkdir(runs, { recursive: true });
  const root = await mkdtemp(join(runs, 'scanlab-fixture-test-'));
  t.after(() => rm(root, { recursive: true, maxRetries: 5, retryDelay: 100 }));
  const directory = await prepareLocalDemo('pin-baseline', root, 'scanlab');
  const start = join(directory, 'start');
  const reference = join(directory, 'reference');
  const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'));
  assert.equal(manifest.exercise, 'scanlab');
  assert.equal(manifest.sourceRole, 'scanlab-reference');
  const names = await readdir(start);
  for (const excluded of ['context', 'node_modules', '.git', '.demo-runs']) assert.ok(!names.includes(excluded));
  assert.match(await readFile(join(start, 'src', 'scanlab', 'state.jl'), 'utf8'), /not implemented in this teaching start/);
  for (const parts of [
    ['src', 'scanlab', 'simulation.jl'], ['scanlab', 'test', 'science.jl'],
    ['scanlab', 'test', 'state.jl'], ['scanlab', 'e2e', 'scanlab.spec.js'], ['src', 'requests.jl']
  ]) {
    assert.equal(await readFile(join(start, ...parts), 'utf8'), await readFile(join(reference, ...parts), 'utf8'));
  }
  applyFixture(start, join(start, 'docs', 'fixtures', 'scanlab-start.patch'), { reverse: true });
  for (const parts of [['src', 'scanlab', 'state.jl'], ['public', 'scanlab', 'app.js']]) {
    const normalize = (text) => text.replaceAll('\r\n', '\n');
    assert.equal(normalize(await readFile(join(start, ...parts), 'utf8')), normalize(await readFile(join(reference, ...parts), 'utf8')));
  }
});
