import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validRun } from './prepare-web-demo.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const entries = [
  '.gitignore', '.github', '.vscode', 'Project.toml', 'Manifest.toml',
  'package.json', 'package-lock.json', 'playwright.config.js', 'README.md',
  'DEMO-GUIDE.md', 'LICENSE', 'src', 'public', 'scripts', 'test', 'e2e', 'docs', 'scanlab'
];

function runFixture(directory, fixture, { reverse = false, check = false } = {}) {
  const result = spawnSync('git', [
    'apply', '--no-index', '--ignore-space-change',
    ...(reverse ? ['--reverse'] : []), ...(check ? ['--check'] : []), fixture
  ], {
    cwd: directory, encoding: 'utf8',
    env: { ...process.env, GIT_CEILING_DIRECTORIES: dirname(directory) }
  });
  if (result.error) throw result.error;
  return result;
}

export function applyFixture(directory, fixture, options = {}) {
  const result = runFixture(directory, fixture, options);
  if (result.status !== 0) throw new Error(`Fixture failed in ${directory}: ${result.stderr || result.stdout}`);
}

export async function prepareLocalDemo(run, outputRoot = root, exercise = 'request-desk') {
  if (!validRun(run)) throw new Error('Use a unique --run of 1-40 lowercase letters, digits, or internal hyphens.');
  if (!['request-desk', 'scanlab'].includes(exercise)) throw new Error('Use --exercise request-desk or scanlab.');
  const parent = join(outputRoot, '.demo-runs');
  await mkdir(parent, { recursive: true });
  const directory = join(parent, run);
  await mkdir(directory);
  for (const role of ['reference', 'start']) {
    const destination = join(directory, role);
    await mkdir(destination);
    for (const entry of entries) {
      await cp(join(root, entry), join(destination, entry), { recursive: true, errorOnExist: true, force: false });
    }
  }
  const start = join(directory, 'start');
  const reference = join(directory, 'reference');
  const checkpoint = exercise === 'scanlab' ? 'scanlab' : 'julia';
  const fixture = join(start, 'docs', 'fixtures', `${checkpoint}-start.patch`);
  const forward = runFixture(start, fixture, { check: true });
  let sourceRole;
  if (forward.status === 0) {
    sourceRole = `${checkpoint}-reference`;
    applyFixture(start, fixture);
  } else {
    const reverse = runFixture(reference, fixture, { reverse: true, check: true });
    if (reverse.status !== 0) {
      throw new Error(`Source matches neither the Julia reference nor its untouched start fixture. Do not prepare from a partial implementation.\n${forward.stderr}\n${reverse.stderr}`);
    }
    sourceRole = `${checkpoint}-start`;
    applyFixture(reference, fixture, { reverse: true });
  }
  const changedFile = exercise === 'scanlab' ? join('src', 'scanlab', 'state.jl') : join('src', 'requests.jl');
  if (await readFile(join(start, changedFile), 'utf8') ===
      await readFile(join(reference, changedFile), 'utf8')) {
    throw new Error('Fixture made no change; refusing to claim a prepared starting snapshot.');
  }
  const manifest = {
    run, state: 'prepared-local', exercise, sourceRole, start: `${checkpoint}-start`, reference: `${checkpoint}-reference`,
    expectedStartResult: exercise === 'scanlab' ?
      'Baseline-pinning/comparison tests fail; scientific simulation stays correct.' :
      'Name-rule tests fail until the approved change is implemented.',
    sourceManifestSha256: createHash('sha256').update(await readFile(join(root, 'Manifest.toml'))).digest('hex'),
    warning: 'No Git repositories, branches, tags or hosted resources were created. Private context, data caches and installed dependencies were not copied.'
  };
  await writeFile(join(directory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
  return directory;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    if (![4, 6].includes(process.argv.length) || process.argv[2] !== '--run' ||
        (process.argv.length === 6 && process.argv[4] !== '--exercise')) {
      throw new Error('Usage: npm run demo:local -- --run RUN [--exercise request-desk|scanlab]');
    }
    const exercise = process.argv[5] || 'request-desk';
    const directory = await prepareLocalDemo(process.argv[3], root, exercise);
    console.log(`Prepared local start/reference snapshots: ${directory}`);
    console.log('Keep JULIA_DEPOT_PATH and DEMO_DATA_PATH pointed at the prepared root cache before changing directories.');
    console.log(`The ${exercise} start snapshot deliberately fails its feature tests. Read docs/demo-lifecycle.md before presenting.`);
  } catch (error) {
    console.error(`Local preparation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
