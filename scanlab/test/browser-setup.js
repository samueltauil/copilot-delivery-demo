import { fileURLToPath } from 'node:url';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { browserUrl, startBackend } from '../../scripts/scanlab-backend.js';

export default async function setup() {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  await mkdir(join(root, '.demo-runs'), { recursive: true });
  const stateDirectory = await mkdtemp(join(root, '.demo-runs', 'scanlab-browser-'));
  let backend;
  try {
    backend = await startBackend(root, { reuse: false, stateDirectory });
  } catch (error) {
    await rm(stateDirectory, { recursive: true, maxRetries: 5 });
    throw error;
  }
  process.env.SCANLAB_TEST_URL = browserUrl(backend.connection);
  return async () => {
    await backend.stop();
    await rm(stateDirectory, { recursive: true, maxRetries: 5 });
  };
}
