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
const stages = ['simulating', 'writing', 'reopening', 'verifying'];
const viewInputs = ['pan-x', 'pan-y', 'window-center', 'window-width'];

function selectedResult() {
  return $('inspect-side').value === 'baseline' ? state?.baseline : state?.result;
}

function renderInspector() {
  const result = selectedResult();
  const dicom = result?.dicom;
  $('evidence').replaceChildren();
  $('dicom-tags').replaceChildren();
  $('download-dicom').disabled = requesting || !dicom || state?.status === 'running';
  if (!dicom) {
    $('integrity-title').textContent = 'No verified acquisition selected';
    $('integrity-detail').textContent = 'Run an experiment, or pin a completed result to inspect its reference evidence.';
    $('provenance').textContent = 'Run an experiment to inspect its parameters and provenance.';
    return;
  }
  $('integrity-title').textContent = 'Stored pixels survived exactly';
  $('integrity-detail').textContent = `Reopened 16-bit DICOM. Maximum quantization error ${dicom.maxAbsoluteError.toExponential(3)} a.u.; allowed half-step ${dicom.errorBound.toExponential(3)} a.u. This is not a clinical quality score.`;
  const values = [
    ['Run ID', result.id],
    ['Pinned baseline run ID', state.baseline?.id || 'Not pinned'],
    ['DICOM file SHA-256', dicom.fileHash],
    ['Reopened pixel SHA-256', dicom.decodedPixelHash],
    ['Pinned DICOM SHA-256', state.baseline?.dicom?.fileHash || 'Not pinned'],
    ['Execution', `${result.computeSeconds.toFixed(3)} s simulation / ${result.roundtripSeconds.toFixed(3)} s DICOM round trip`]
  ];
  for (const [label, value] of values) {
    const group = document.createElement('div');
    const term = document.createElement('dt');
    const detail = document.createElement('dd');
    term.textContent = label;
    detail.textContent = value;
    group.append(term, detail);
    $('evidence').append(group);
  }
  for (const tag of dicom.tags) {
    const row = document.createElement('tr');
    for (const value of [tag.tag, tag.name, tag.value]) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    }
    $('dicom-tags').append(row);
  }
  const { figure, pixels, dicom: { fileBase64, ...metadata }, ...acquisition } = result;
  $('provenance').textContent = JSON.stringify({ ...acquisition, dicom: metadata }, null, 2);
}

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
    paper_bgcolor: '#050608', plot_bgcolor: '#050608',
    xaxis: { ...figure.layout.xaxis, showgrid: false, zeroline: false, title: '', showticklabels: false, fixedrange: true },
    yaxis: { ...figure.layout.yaxis, showgrid: false, zeroline: false, title: '', showticklabels: false, fixedrange: true }
  };
  await Plotly.react(element, figure.data, figure.layout, {
    responsive: true, displayModeBar: false, displaylogo: false
  });
  rendered[side] = result.id;
  $(`${side}-label`).textContent = result.label;
  $(`${side}-caption`).textContent = `${result.parameters.resolution} × ${result.parameters.resolution} · Reopened DICOM · Run ${result.id}`;
  $(`rail-${side}`).textContent = `${result.label} / ${result.id.slice(0, 8)}`;
}

async function applyState(next) {
  if (next.workflowVersion !== 'dicom-v1') {
    throw new Error('This service predates the DICOM workbench. Stop and restart the ScanLab service you own, then reopen the Canvas.');
  }
  if (state && state.instanceId !== next.instanceId) {
    rendered = { current: null, baseline: null };
    for (const side of ['current', 'baseline']) {
      $(`${side}-image`).hidden = true;
      $(`${side}-empty`).hidden = false;
      $(`${side}-caption`).textContent = '';
      $(`${side}-label`).textContent = side === 'baseline' ? 'Not pinned' : 'Awaiting a live run';
      $(`rail-${side}`).textContent = 'No acquisition yet';
    }
  }
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
  for (const id of viewInputs) $(id).disabled = !state.result;
  const labels = {
    idle: 'Ready. Choose a scenario and compute a new experiment.',
    running: `${({ simulating: 'Simulating acquisition', writing: 'Writing DICOM', reopening: 'Reopening DICOM', verifying: 'Verifying pixels' })[state.stage] || 'Computing acquisition'} live on this machine…`,
    succeeded: 'Live computation complete. DICOM reopened and verified. Pin this result or explore another scenario.',
    failed: 'The latest run failed. Any visible image belongs to its earlier completed run.'
  };
  $('status').textContent = labels[state.status];
  $('error').textContent = state.error || actionError;
  const activeStage = stages.indexOf(state.stage);
  for (const [index, item] of [...$('pipeline').children].entries()) {
    item.dataset.state = state.status === 'succeeded' || index < activeStage ? 'done' :
      state.status === 'running' && index === activeStage ? 'active' : 'pending';
    if (item.dataset.state === 'active') item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
  }
  await renderImage('current', state.result);
  await renderImage('baseline', state.baseline);
  renderInspector();
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
    const x = Number($('pan-x').value), y = Number($('pan-y').value);
    const level = Number($('window-center').value), width = Number($('window-width').value);
    await Plotly.relayout($(`${side}-image`), {
      'xaxis.range': [center + x - radius, center + x + radius],
      'yaxis.range': [center + y - radius, center + y + radius]
    });
    await Plotly.restyle($(`${side}-image`), { zmin: level - width / 2, zmax: level + width / 2 });
  }
}

async function action(path, input) {
  actionVersion++;
  requesting = true;
  $('run').disabled = true;
  $('pin').disabled = true;
  $('preset').disabled = true;
  $('export').disabled = true;
  $('download-dicom').disabled = true;
  actionError = '';
  $('error').textContent = '';
  try {
    await api(path, input);
  } catch (error) {
    actionError = error.message;
    $('error').textContent = actionError;
    $('status').textContent = 'The action did not complete.';
    requesting = false;
    if (state) await applyState(state);
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
    for (const id of ['run', 'pin', 'export', 'preset', 'download-dicom']) $(id).disabled = true;
  } finally {
    refreshing = false;
  }
}

$('run').addEventListener('click', () => action('run', { preset: $('preset').value }));
$('preset').addEventListener('change', () => action('preset', { preset: $('preset').value }));
$('pin').addEventListener('click', () => action('pin', { runId: state.result.id }));
$('zoom').addEventListener('input', () => synchronizeZoom().catch((error) => { $('error').textContent = error.message; }));
for (const id of viewInputs) {
  $(id).addEventListener('input', () => synchronizeZoom().catch((error) => { $('error').textContent = error.message; }));
}
$('reset-view').addEventListener('click', () => {
  $('zoom').value = '1';
  $('pan-x').value = '0';
  $('pan-y').value = '0';
  $('window-center').value = '0.5';
  $('window-width').value = '1';
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

$('inspect-side').addEventListener('change', renderInspector);
const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(tab) {
  for (const item of tabs) {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    $(item.getAttribute('aria-controls')).hidden = !selected;
  }
}
for (const [index, tab] of tabs.entries()) {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', (event) => {
    let next;
    if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
    if (event.key === 'ArrowLeft') next = tabs[(index + tabs.length - 1) % tabs.length];
    if (event.key === 'Home') next = tabs[0];
    if (event.key === 'End') next = tabs.at(-1);
    if (next) { event.preventDefault(); selectTab(next); next.focus(); }
  });
}
$('download-dicom').addEventListener('click', async () => {
  const result = selectedResult();
  if (!result?.dicom) return;
  try {
    const response = await fetch(`/api/dicom/${result.id}`, {
      headers: { 'x-scanlab-token': token || '' }, signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
      const body = await response.json();
      throw new Error(body.error?.message || `Request failed (${response.status}).`);
    }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = `scanlab-${result.id}.dcm`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    $('error').textContent = `Could not download DICOM: ${error.message}`;
  }
});

await refresh();
setInterval(() => { if (!requesting) refresh(); }, 1000);
