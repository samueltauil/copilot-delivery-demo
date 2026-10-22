import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { juliaRuntime } from './julia-runtime.js';
import { JULIA_THREADS, browserUrl, startBackend } from './scanlab-backend.js';

const root = fileURLToPath(new URL('..', import.meta.url));

export async function runJulia(script, cwd = root) {
  const runtime = juliaRuntime(cwd, join(cwd, 'scanlab'));
  return new Promise((resolve, reject) => {
    const child = spawn(runtime.executable, [...runtime.args, JULIA_THREADS, script], {
      cwd, env: runtime.env, stdio: 'inherit'
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`Julia check failed (${code ?? signal}).`));
    });
  });
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    const command = process.argv[2] || 'start';
    if (process.argv.length > 3 || !['start', 'setup', 'test'].includes(command)) {
      throw new Error('Usage: node scripts/scanlab.js start|setup|test');
    }
    if (command === 'setup') {
      await runJulia(join(root, 'scripts', 'setup-scanlab.jl'));
    } else if (command === 'test') {
      await runJulia(join(root, 'scanlab', 'test', 'runtests.jl'));
    } else {
      console.error('Preparing ScanLab. This starts a live numerical service, not a saved-result replay.');
      const backend = await startBackend(root);
      console.log(`ScanLab ready: ${browserUrl(backend.connection)}`);
      console.log('Synthetic research only. Keep this terminal open; press Ctrl+C to stop an owned server.');
      if (backend.owned) {
        const stop = () => backend.stop().catch((error) => { console.error(error.message); process.exitCode = 1; });
        process.once('SIGINT', stop);
        process.once('SIGTERM', stop);
      }
    }
  } catch (error) {
    console.error(`ScanLab failed: ${error.message}`);
    process.exitCode = 1;
  }
}
