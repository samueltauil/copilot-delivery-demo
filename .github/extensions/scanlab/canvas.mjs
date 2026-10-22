import { browserUrl, callBackend, forAgent, startBackend } from '../../../scripts/scanlab-backend.js';
import { buildPullRequestNote } from '../../../public/scanlab/story.js';

const presetSchema = {
  type: 'object', properties: { preset: { type: 'string', enum: ['still', 'gentle', 'larger'] } },
  required: ['preset'], additionalProperties: false
};
const runSchema = {
  type: 'object',
  properties: {
    ...presetSchema.properties,
    waitForResult: {
      type: 'boolean',
      description: 'Wait (up to about 90 seconds) for the scan to finish and return the result summary. Default false returns immediately with the run ID.'
    }
  },
  required: ['preset'], additionalProperties: false
};

const WAIT_LIMIT_MS = 90_000;
const POLL_MS = 500;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function makeCanvas({
  createCanvas, CanvasError, root, log, start = startBackend, call = callBackend,
  sleep = delay, waitLimitMs = WAIT_LIMIT_MS
}) {
  let backend;
  const instances = new Set();
  const getBackend = () => backend ||= start(root, { log }).catch((error) => { backend = undefined; throw error; });
  // Requests from this extension are attributed to Copilot in the workbench activity list.
  const asCopilot = { actor: 'copilot' };
  const invoke = (action) => async (context) => {
    try {
      const runtime = await getBackend();
      const input = ['state', 'compare'].includes(action) ? undefined : context.input;
      return forAgent(await call(runtime.connection, action, input, asCopilot));
    } catch (error) {
      throw new CanvasError('scanlab_action_failed', error.message);
    }
  };
  const runExperiment = async (context) => {
    try {
      const runtime = await getBackend();
      const { waitForResult = false, ...input } = context.input ?? {};
      const started = forAgent(await call(runtime.connection, 'run', input, asCopilot));
      if (!waitForResult) return started;
      const deadline = Date.now() + waitLimitMs;
      for (;;) {
        const status = await call(runtime.connection, 'status', undefined, asCopilot);
        if (status.status !== 'running' || status.activeRunId !== started.runId) break;
        if (Date.now() >= deadline) {
          return { ...started, timedOut: true, note: 'The scan is still running. Call get_state to read it when it finishes.' };
        }
        await sleep(POLL_MS);
      }
      return { ...started, ...forAgent(await call(runtime.connection, 'state', undefined, asCopilot)) };
    } catch (error) {
      throw new CanvasError('scanlab_action_failed', error.message);
    }
  };
  const draftPullRequestNote = async () => {
    try {
      const runtime = await getBackend();
      const note = buildPullRequestNote(await call(runtime.connection, 'state', undefined, asCopilot));
      if (!note) throw new Error('There is no completed scan yet. Run an experiment first.');
      return { note };
    } catch (error) {
      throw new CanvasError('scanlab_action_failed', error.message);
    }
  };
  return createCanvas({
    id: 'scanlab', displayName: 'ScanLab',
    description: 'Compute synthetic acquisitions, reopen DICOM, pin a baseline, and inspect image-integrity evidence. No clinical use.',
    actions: [
      {
        name: 'get_state',
        description: 'Read the live experiment: status, the latest scan, the kept reference, what changed between them, the activity list, and DICOM evidence (file hash and length; image arrays and file bytes are omitted).',
        handler: invoke('state')
      },
      { name: 'select_preset', description: 'Select one of three fixed synthetic motion presets.', inputSchema: presetSchema, handler: invoke('preset') },
      {
        name: 'run_experiment',
        description: 'Compute a new live CPU simulation. Rejects concurrent starts; never replays saved results. Set waitForResult to wait for the summary.',
        inputSchema: runSchema, handler: runExperiment
      },
      {
        name: 'pin_baseline', description: 'Keep the specified completed scan as the reference (baseline) without changing the scientific model.',
        inputSchema: { type: 'object', properties: { runId: { type: 'string' } }, required: ['runId'], additionalProperties: false },
        handler: invoke('pin')
      },
      {
        name: 'get_comparison',
        description: 'Read the latest scan and the kept reference with parameters, provenance, change measurements and the activity list (image arrays and file bytes are omitted).',
        handler: invoke('compare')
      },
      {
        name: 'get_pr_note',
        description: 'Draft Markdown evidence for a pull request from the real run: movement, run IDs, fingerprints, what changed, the saved-file check and who did what. Practice data only; make no medical claims.',
        handler: draftPullRequestNote
      }
    ],
    open: async (context) => {
      try {
        const runtime = await getBackend();
        instances.add(context.instanceId);
        return { title: 'ScanLab · Image Integrity Workbench', url: browserUrl(runtime.connection) };
      } catch (error) {
        throw new CanvasError('scanlab_start_failed', error.message);
      }
    },
    onClose: async (context) => {
      instances.delete(context.instanceId);
      if (instances.size || !backend) return;
      const runtime = await backend;
      await runtime.stop();
      backend = undefined;
    }
  });
}
