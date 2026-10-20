import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const launcher = fileURLToPath(new URL('../scripts/julia.js', import.meta.url));

test('Julia launcher rejects unknown commands and exposes missing runtimes', () => {
  const invalid = spawnSync(process.execPath, [launcher, 'unknown'], { encoding: 'utf8' });
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /Usage:/);
  const missing = spawnSync(process.execPath, [launcher, 'test'], {
    encoding: 'utf8', env: { ...process.env, JULIA_EXE: 'missing-synthetic-demo-julia-executable' }
  });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /Could not launch Julia:/);
});
