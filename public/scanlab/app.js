const $ = (id) => document.getElementById(id);
const token = location.hash.slice(1) || sessionStorage.getItem('scanlab-token');
if (location.hash) {
  sessionStorage.setItem('scanlab-token', token);
  history.replaceState(null, '', location.pathname);
}
let state;
let requesting = false;
let refreshing = false;
let actionError = '';
let actionVersion = 0;
let rendered = { current: null, baseline: null };

async function api(path, input) {
  const response = await fetch(`/api/${path}`, {
    method: input === undefined ? 'GET' : 'POST',
    headers: { 'x-scanlab-token': token || '', ...(input === undefined ? {} : { 'content-type': 'application/json' }) },
    body: input === undefined ? undefined : JSON.stringify(input),
    signal: AbortSignal.timeout(10000)
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message || `Request failed (${response.status}).`);
  return body;
}

async function renderImage(side, result) {
  if (!result || rendered[side] === result.id) return;
  const figure = structuredClone(result.figure);
  const element = $(`${side}-image`);
  $(`${side}-empty`).hidden = true;
  element.hidden = false;
  figure.layout = {
    ...figure.layout, height: 370, margin: { l: 16, r: 25, t: 15, b: 25 },
    paper_bgcolor: '#101e26', plot_bgcolor: '#101e26',
    xaxis: { ...figure.layout.xaxis, showgrid: false, zeroline: false, title: '', showticklabels: false, fixedrange: true },
    yaxis: { ...figure.layout.yaxis, showgrid: false, zeroline: false, title: '', showticklabels: false, fixedrange: true }
  };
  await Plotly.react(element, figure.data, figure.layout, {
    responsive: true, displayModeBar: false, displaylogo: false
  });
  rendered[side] = result.id;
  $(`${side}-label`).textContent = result.label;
  $(`${side}-caption`).textContent = `${result.parameters.resolution} × ${result.parameters.resolution} · ${result.computeSeconds.toFixed(3)} s computation · Run ${result.id.slice(0, 8)}`;
}

async function applyState(next) {
  state = next;
  $('preset').value = state.selectedPreset;
  const running = state.status === 'running';
  $('run').disabled = running || requesting;
  $('run').textContent = running ? 'Computing…' : 'Run experiment';
  $('preset').disabled = running || requesting;
  $('pin').disabled = running || requesting || !state.result;
  $('export').disabled = running || requesting || !state.result;
  $('zoom').disabled = !state.result;
  $('reset-view').disabled = !state.result;
  const labels = {
    idle: 'Ready. Choose a scenario and compute a new experiment.',
    running: `Computing ${state.presets.find((preset) => preset.id === state.selectedPreset).label.toLowerCase()} live on this machine…`,
    succeeded: 'Live computation complete. Pin this result or explore another scenario.',
    failed: 'The latest run failed. Any visible image belongs to its earlier completed run.'
  };
  $('status').textContent = labels[state.status];
  $('error').textContent = state.error || actionError;
  await renderImage('current', state.result);
  await renderImage('baseline', state.baseline);
  if (state.result) {
    const { figure, pixels, ...metadata } = state.result;
    $('provenance').textContent = JSON.stringify(metadata, null, 2);
  }
  await synchronizeZoom();
}

async function synchronizeZoom() {
  const zoom = Number($('zoom').value);
  $('zoom-label').textContent = `${zoom}×`;
  for (const side of ['current', 'baseline']) {
    const result = side === 'current' ? state?.result : state?.baseline;
    if (!result || !rendered[side]) continue;
    const size = result.parameters.resolution;
    const center = (size - 1) / 2;
    const radius = size / (2 * zoom);
    await Plotly.relayout($(`${side}-image`), {
      'xaxis.range': [center - radius, center + radius],
      'yaxis.range': [center - radius, center + radius]
    });
  }
}

async function action(path, input) {
  actionVersion++;
  requesting = true;
  $('run').disabled = true;
  $('pin').disabled = true;
  $('preset').disabled = true;
  $('export').disabled = true;
  actionError = '';
  $('error').textContent = '';
  try {
    await api(path, input);
  } catch (error) {
    actionError = error.message;
    $('error').textContent = actionError;
    $('status').textContent = 'The action did not complete.';
    requesting = false;
    $('run').disabled = state?.status === 'running';
    return;
  }
  requesting = false;
  await refresh();
}

async function refresh() {
  if (refreshing) return;
  refreshing = true;
  const version = actionVersion;
  try {
    const next = await api('state');
    if (version === actionVersion) await applyState(next);
  } catch (error) {
    $('error').textContent = `Cannot read the live experiment: ${error.message}`;
    $('status').textContent = 'Disconnected. Existing images are not new results.';
    for (const id of ['run', 'pin', 'export', 'preset']) $(id).disabled = true;
  } finally {
    refreshing = false;
  }
}

$('run').addEventListener('click', () => action('run', { preset: $('preset').value }));
$('preset').addEventListener('change', () => action('preset', { preset: $('preset').value }));
$('pin').addEventListener('click', () => action('pin', { runId: state.result.id }));
$('zoom').addEventListener('input', () => synchronizeZoom().catch((error) => { $('error').textContent = error.message; }));
$('reset-view').addEventListener('click', () => {
  $('zoom').value = '1';
  synchronizeZoom().catch((error) => { $('error').textContent = error.message; });
});
$('export').addEventListener('click', async () => {
  try {
    const comparison = await api('compare');
    const url = URL.createObjectURL(new Blob([JSON.stringify(comparison, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `scanlab-${state.result.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    $('error').textContent = `Could not save the comparison: ${error.message}`;
  }
});

await refresh();
setInterval(() => { if (!requesting) refresh(); }, 1000);
