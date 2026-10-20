import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { juliaRuntime } from './julia-runtime.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const targets = { start: 'serve.jl', setup: 'setup.jl', test: 'runtests.jl' };
const target = targets[process.argv[2]];
if (!target || process.argv.length !== 3) {
  console.error('Usage: node scripts/julia.js start|setup|test');
  process.exitCode = 1;
} else {
  const script = process.argv[2] === 'test' ? join(root, 'test', 'runtests.jl') : join(root, 'scripts', target);
  const runtime = juliaRuntime(root);
  const child = spawn(runtime.executable, [...runtime.args, script], {
    cwd: root,
    stdio: 'inherit',
    env: runtime.env
  });
  child.on('error', (error) => {
    console.error(`Could not launch Julia: ${error.message}. Install Julia 1.10+ or set JULIA_EXE to its executable.`);
    process.exitCode = 1;
  });
  child.on('exit', (code, signal) => {
    if (signal) console.error(`Julia stopped with signal ${signal}.`);
    process.exitCode = code ?? 1;
  });
}
