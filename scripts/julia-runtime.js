import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

export function juliaRuntime(root, project = root) {
  const common = spawnSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
    cwd: root, encoding: 'utf8', windowsHide: true
  });
  const canonical = common.status === 0 ? dirname(common.stdout.trim()) : root;
  const candidates = [root, canonical];
  let current = dirname(root);
  while (current !== dirname(current)) {
    candidates.push(current);
    current = dirname(current);
  }
  const local = candidates.find((candidate) => existsSync(join(candidate, '.demo-runs', 'tools', 'julia-1.10.12', 'bin', 'julia.exe')));
  const executable = process.env.JULIA_EXE || (local ? join(local, '.demo-runs', 'tools', 'julia-1.10.12', 'bin', 'julia.exe') : 'julia');
  const cacheRoot = local || canonical;
  return {
    executable,
    args: ['--startup-file=no', `--project=${project}`],
    env: { ...process.env, JULIA_DEPOT_PATH: process.env.JULIA_DEPOT_PATH || join(cacheRoot, '.demo-runs', 'julia-depot') }
  };
}
