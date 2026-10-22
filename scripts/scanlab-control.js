import { fileURLToPath, pathToFileURL } from 'node:url';
import { callBackend, connectBackend, withoutDicomBytes } from './scanlab-backend.js';

const root = fileURLToPath(new URL('..', import.meta.url));

export function controlRequest(args) {
  const [action, value] = args;
  if (action === 'state' && args.length === 1) return { action: 'state' };
  if (action === 'run' && args.length === 2 && ['still', 'gentle', 'larger'].includes(value)) {
    return { action: 'run', input: { preset: value } };
  }
  if (action === 'pin' && args.length === 2 && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value)) {
    return { action: 'pin', input: { runId: value } };
  }
  throw new Error('Usage: npm run scanlab:control -- state | run still|gentle|larger | pin RUN_ID');
}

export function summarizeState(state) {
  const summarize = (result) => result ? {
    id: result.id, preset: result.preset, requestedBy: result.requestedBy, resultHash: result.resultHash,
    inputHash: result.inputHash, computeSeconds: result.computeSeconds,
    dicom: result.dicom ? {
      sopInstanceUid: result.dicom.sopInstanceUid, fileHash: result.dicom.fileHash,
      byteLength: result.dicom.byteLength, storedPixelsExact: result.dicom.storedPixelsExact,
      maxAbsoluteError: result.dicom.maxAbsoluteError, errorBound: result.dicom.errorBound
    } : null
  } : null;
  return {
    workflowVersion: state.workflowVersion, instanceId: state.instanceId, status: state.status,
    activeRunId: state.activeRunId, selectedPreset: state.selectedPreset, result: summarize(state.result),
    baseline: summarize(state.baseline), changes: state.changes ?? null,
    activity: (state.activity ?? []).slice(-5), error: state.error
  };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    const { action, input } = controlRequest(process.argv.slice(2));
    const connection = await connectBackend(root);
    const result = await callBackend(connection, action, input);
    console.log(JSON.stringify(action === 'run' ? withoutDicomBytes(result) : summarizeState(result), null, 2));
  } catch (error) {
    console.error(`ScanLab control failed: ${error.message}`);
    process.exitCode = 1;
  }
}
