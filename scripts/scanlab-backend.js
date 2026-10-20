import { spawn } from 'node:child_process';
import { mkdir, open, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { juliaRuntime } from './julia-runtime.js';

export function validateConnection(value) {
  const url = new URL(value.url);
  const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' ||
      !url.port || url.pathname !== '/' || url.search || url.hash || url.username || url.password ||
      !uuid.test(value.token) || !uuid.test(value.instanceId) ||
      !Number.isInteger(value.pid) || value.pid < 1) {
    throw new Error('Invalid local ScanLab connection metadata.');
  }
  return value;
}

export async function callBackend(connection, action, input) {
  validateConnection(connection);
  const routes = { state: '/api/state', run: '/api/run', preset: '/api/preset', pin: '/api/pin', compare: '/api/compare' };
  if (!Object.hasOwn(routes, action)) throw new Error('Unknown ScanLab action.');
  const readOnly = ['state', 'compare'].includes(action);
  const response = await fetch(connection.url + routes[action], {
    method: readOnly ? 'GET' : 'POST',
    headers: { 'x-scanlab-token': connection.token, ...(readOnly ? {} : { 'content-type': 'application/json' }) },
    body: readOnly ? undefined : JSON.stringify(input),
    signal: AbortSignal.timeout(10000)
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message || `ScanLab returned HTTP ${response.status}.`);
  return body;
}

async function readConnection(file) {
  try {
    return validateConnection(JSON.parse(await readFile(file, 'utf8')));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

export async function startBackend(root, {
  reuse = true, log = (message) => console.error(message),
  stateDirectory = join(root, '.demo-runs', 'scanlab')
} = {}) {
  const directory = stateDirectory;
  await mkdir(directory, { recursive: true });
  const activeFile = join(directory, 'active.json');
  const existing = await readConnection(activeFile);
  if (existing && !reuse) throw new Error('An isolated test directory is required; refusing to replace a recorded session.');
  if (reuse) {
    if (existing) {
      let live;
      try {
        live = await callBackend(existing, 'state');
      } catch (error) {
        if (error.cause?.code !== 'ECONNREFUSED') throw error;
        log('The previous ScanLab server is no longer listening; starting a fresh session.');
      }
      if (live) {
        if (live.instanceId !== existing.instanceId) throw new Error('A different process is using the recorded port.');
        return { connection: existing, owned: false, stop: async () => {} };
      }
    }
  }
  const lockFile = join(directory, 'starting.lock');
  let lock;
  try {
    lock = await open(lockFile, 'wx');
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw new Error('A ScanLab startup is already in progress. Wait for it to finish; do not start a second service or delete its lock.');
    }
    throw error;
  }
  const runtime = juliaRuntime(root, join(root, 'scanlab'));
  let child;
  let connection;
  let closed = false;
  let stopping = false;
  let cleanupPromise;
  const removeOwnedMetadata = () => cleanupPromise ||= (async () => {
    const current = await readConnection(activeFile);
    if (connection && current?.instanceId === connection.instanceId) await rm(activeFile);
  })();
  try {
    child = spawn(runtime.executable, [...runtime.args, '--threads=2', join(root, 'scripts', 'serve-scanlab.jl')], {
      cwd: root, env: runtime.env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true
    });
    child.stderr.on('data', (chunk) => log(chunk.toString().trimEnd()));
    connection = await new Promise((resolve, reject) => {
      let buffer = '';
      const timer = setTimeout(() => reject(new Error('ScanLab did not become ready. Inspect the local startup error; no fallback result was used.')), 300000);
      const finish = (error, value) => { clearTimeout(timer); error ? reject(error) : resolve(value); };
      child.once('error', (error) => {
        closed = !child.pid;
        finish(new Error(`Could not launch Julia: ${error.message}. Run npm run scanlab:setup.`));
      });
      child.once('exit', (code, signal) => { closed = true; finish(new Error(`ScanLab exited before readiness (${code ?? signal}).`)); });
      child.stdout.on('data', (chunk) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('SCANLAB_READY ')) {
            if (line.trim()) log(line);
            continue;
          }
          try {
            finish(null, validateConnection(JSON.parse(line.slice('SCANLAB_READY '.length))));
          } catch (error) {
            finish(error);
          }
        }
      });
    });
    const state = await callBackend(connection, 'state');
    if (state.instanceId !== connection.instanceId || state.status !== 'idle' || state.result !== null) {
      throw new Error('ScanLab did not start with a fresh, empty session.');
    }
    await writeFile(activeFile, JSON.stringify(connection), { mode: 0o600 });
    let stopPromise;
    const stop = () => stopPromise ||= (async () => {
      stopping = true;
      if (!closed) {
        const exited = new Promise((resolve) => child.once('exit', resolve));
        child.kill();
        await exited;
      }
      await removeOwnedMetadata();
    })();
    child.once('exit', (code, signal) => {
      closed = true;
      if (!stopping) log(`ScanLab stopped unexpectedly (${code ?? signal}). No fallback result was used.`);
      removeOwnedMetadata().catch((error) => log(`Could not remove owned connection metadata: ${error.message}`));
    });
    return { connection, owned: true, stop, child };
  } catch (error) {
    if (child && !closed) {
      const exited = new Promise((resolve) => child.once('exit', resolve));
      child.kill();
      await exited;
    }
    throw error;
  } finally {
    await lock.close();
    await rm(lockFile);
  }
}

export function browserUrl(connection) {
  validateConnection(connection);
  return `${connection.url}/#${connection.token}`;
}
