import { browserUrl, callBackend, startBackend } from '../../../scripts/scanlab-backend.js';

const presetSchema = {
  type: 'object', properties: { preset: { type: 'string', enum: ['still', 'gentle', 'larger'] } },
  required: ['preset'], additionalProperties: false
};

export function makeCanvas({ createCanvas, CanvasError, root, log, start = startBackend, call = callBackend }) {
  let backend;
  const instances = new Set();
  const getBackend = () => backend ||= start(root, { log }).catch((error) => { backend = undefined; throw error; });
  const invoke = (action) => async (context) => {
    try {
      const runtime = await getBackend();
      return await call(runtime.connection, action, ['state', 'compare'].includes(action) ? undefined : context.input);
    } catch (error) {
      throw new CanvasError('scanlab_action_failed', error.message);
    }
  };
  return createCanvas({
    id: 'scanlab', displayName: 'ScanLab',
    description: 'Compare live synthetic imaging experiments, pin a baseline, and inspect reproducible evidence. No clinical use.',
    actions: [
      { name: 'get_state', description: 'Read actual live experiment state and completed results.', handler: invoke('state') },
      { name: 'select_preset', description: 'Select one of three fixed synthetic motion presets.', inputSchema: presetSchema, handler: invoke('preset') },
      { name: 'run_experiment', description: 'Compute a new live CPU simulation. Rejects concurrent starts; never replays saved results.', inputSchema: presetSchema, handler: invoke('run') },
      {
        name: 'pin_baseline', description: 'Pin the specified completed result without changing the scientific model.',
        inputSchema: { type: 'object', properties: { runId: { type: 'string' } }, required: ['runId'], additionalProperties: false },
        handler: invoke('pin')
      },
      { name: 'get_comparison', description: 'Read current and pinned results with their parameters and provenance.', handler: invoke('compare') }
    ],
    open: async (context) => {
      try {
        const runtime = await getBackend();
        instances.add(context.instanceId);
        return { title: 'ScanLab · synthetic imaging', url: browserUrl(runtime.connection) };
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
