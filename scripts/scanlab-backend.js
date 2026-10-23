import { spawn } from 'node:child_process';
import { mkdir, open, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { juliaRuntime } from './julia-runtime.js';

// Thread 1 is reserved for the web server; scans run on the two worker threads.
// Without a reserved thread a scan can land on the one that owns Julia's event
// loop, and the page freezes until the scan ends.
export const JULIA_THREADS = '--threads=2,1';

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

// Agent-facing views keep the DICOM hash and length but omit the encoded file bytes.
export function withoutDicomBytes(value) {
  if (Array.isArray(value)) return value.map(withoutDicomBytes);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => key !== 'fileBase64')
    .map(([key, item]) => [key, withoutDicomBytes(item)]));
}

// Compact view for agents: also drops the image arrays and plot figure (about 400 KB per result).
// Evidence (hashes, run IDs, timings), change metrics and the activity list stay.
const BULKY_KEYS = new Set(['fileBase64', 'figure', 'pixels']);
export function forAgent(value) {
  if (Array.isArray(value)) return value.map(forAgent);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !BULKY_KEYS.has(key))
    .map(([key, item]) => [key, forAgent(item)]));
}

export const ACTORS = ['you', 'copilot', 'script'];

// `actor` says who is asking, so the workbench activity list can show it. It is
// self-reported display information, not authentication.
export async function callBackend(connection, action, input, { actor = 'script' } = {}) {
  validateConnection(connection);
  const routes = {
    state: '/api/state', status: '/api/status', run: '/api/run', preset: '/api/preset', pin: '/api/pin', compare: '/api/compare'
  };
  if (!Object.hasOwn(routes, action)) throw new Error('Unknown ScanLab action.');
  if (!ACTORS.includes(actor)) throw new Error('Unknown ScanLab actor.');
  const readOnly = ['state', 'status', 'compare'].includes(action);
  const response = await fetch(connection.url + routes[action], {
    method: readOnly ? 'GET' : 'POST',
    headers: {
      'x-scanlab-token': connection.token, 'x-scanlab-actor': actor,
      ...(readOnly ? {} : { 'content-type': 'application/json' })
    },
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

export async function connectBackend(root) {
  const connection = await readConnection(join(root, '.demo-runs', 'scanlab', 'active.json'));
  if (!connection) throw new Error('No active ScanLab session. Run npm run scanlab first and wait for readiness.');
  const state = await callBackend(connection, 'state');
  if (state.instanceId !== connection.instanceId) throw new Error('The recorded session identity does not match the server.');
  return connection;
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
    child = spawn(runtime.executable, [...runtime.args, JULIA_THREADS, join(root, 'scripts', 'serve-scanlab.jl')], {
      cwd: root, env: runtime.env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true
    });
    child.stderr.on('data', (chunk) => log(chunk.toString().trimEnd()));
    connection = await new Promise((resolve, reject) => {
      let buffer = '';
      // Startup computes two full-detail acquisitions on a discarded session.
      const timer = setTimeout(() => reject(new Error('ScanLab did not become ready within 35 minutes. Inspect the local startup error; no fallback result was used.')), 35 * 60_000);
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
