// ScanLab in the browser: a plain-language view of one live experiment.
// Logic shared with the Copilot Canvas and the tests lives in /story.js; this file owns the DOM.
import {
  ZOOM,
  actorName, shortId, canCompare, currentStep, stepStates, runButtonLabel, coachLine, statusLine, stageStates,
  presetBlurb, describeChange, savedFileCheck, relativeTime, recentActivity, suggestedPrompts,
  buildPullRequestNote, differenceMap, clamp, grayWindow, panLimit, viewRange, cellAt, readoutText
} from '/story.js';

const WORKFLOW_VERSION = 'dicom-v2';
const DEFAULT_SIZE = 128;
const POLL_RUNNING_MS = 400;
const POLL_IDLE_MS = 1000;
const SVG_NS = 'http://www.w3.org/2000/svg';
const SIDES = ['baseline', 'current', 'difference'];
const PLOT = { baseline: 'baseline-image', current: 'current-image', difference: 'difference-image' };
const PANE = { baseline: 'pane-baseline', current: 'pane-current', difference: 'pane-difference' };
const GRAY = [[0, '#000000'], [1, '#ffffff']];
const HEAT = [[0, '#000004'], [0.2, '#3b0f70'], [0.4, '#8c2981'], [0.6, '#de4968'], [0.8, '#fe9f6d'], [1, '#fcfdbf']];
const PLOT_CONFIG = { staticPlot: true, displayModeBar: false, displaylogo: false, responsive: false };
const OFFLINE_STATUS = 'Disconnected. Existing images are not new results.';
const COMPARE_HINT = 'Keep a reference, then scan again to compare';
const DEFAULT_VIEW = { zoom: 1, panX: 0, panY: 0, brightness: 0, contrast: 100 };

const $ = (id) => document.getElementById(id);
const IDLE_READOUT = $('readout').textContent;

const token = (() => {
  const fromAddress = location.hash.slice(1);
  if (fromAddress) {
    try { sessionStorage.setItem('scanlab-token', fromAddress); } catch { /* the address token still works for this load */ }
    history.replaceState(null, '', location.pathname);
    return fromAddress;
  }
  try { return sessionStorage.getItem('scanlab-token') || ''; } catch { return ''; }
})();

class ServiceError extends Error {}

async function api(path, input) {
  const headers = { 'x-scanlab-token': token };
  const options = { headers, signal: AbortSignal.timeout(10000) };
  if (input !== undefined) {
    options.method = 'POST';
    options.body = JSON.stringify(input);
    headers['content-type'] = 'application/json';
    headers['x-scanlab-actor'] = 'you';
  }
  const response = await fetch(`/api/${path}`, options);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message || `Request failed (${response.status}).`);
  if (body === null) throw new Error('ScanLab sent a reply this page cannot read.');
  return body;
}

function verified(snapshot) {
  if (snapshot?.workflowVersion !== WORKFLOW_VERSION) {
    throw new ServiceError('This ScanLab service is from an older version. Stop it, start ScanLab again, then reload this page.');
  }
  return snapshot;
}

/* ---------- Session state ---------- */

let state = null;
let requesting = false;
let queued = 0;
let pendingRun = false;
let pendingPin = false;
let lastAction = Promise.resolve();
let refreshing = false;
let actionVersion = 0;
let refreshError = '';
let actionError = '';
let drawError = '';
let disconnected = false;
let pollTimer = 0;
let mode = 'side';
let modeChosen = false;
let lastComparison = '';
let split = 50;
let diffCache = { key: '', map: null };
const view = { ...DEFAULT_VIEW };
const drawn = { baseline: null, current: null, difference: null };

const zOf = (result) => result?.figure?.data?.[0]?.z;
const imageSize = () => zOf(state?.result ?? state?.baseline)?.length ?? DEFAULT_SIZE;
const isKept = () => Boolean(state?.baseline && state?.result && state.baseline.id === state.result.id);
const effectiveMode = () => (canCompare(state) ? mode : 'side');

// The server's state, plus a scan that was just requested and not yet reported back,
// so pressing Run answers instantly.
function shownState() {
  if (!pendingRun || !state || state.status === 'running') return state;
  return { ...state, status: 'running', stage: 'simulating' };
}
const inspected = () => (($('inspect-side').value === 'baseline' && state?.baseline) ? state.baseline : state?.result ?? null);

function getDifference() {
  if (!canCompare(state)) return null;
  const key = `${state.baseline.id}|${state.result.id}`;
  if (diffCache.key !== key) diffCache = { key, map: differenceMap(zOf(state.baseline), zOf(state.result)) };
  return diffCache.map;
}

async function load() {
  if (!state) return verified(await api('state'));
  const { resultId, baselineId, ...live } = verified(await api('status'));
  const changed = live.instanceId !== state.instanceId
    || resultId !== (state.result?.id ?? null) || baselineId !== (state.baseline?.id ?? null);
  return changed ? verified(await api('state')) : { ...state, ...live };
}

async function refresh({ force = false } = {}) {
  if (refreshing && !force) return;
  refreshing = true;
  const version = actionVersion;
  try {
    const next = await load();
    if (version !== actionVersion) return;
    refreshError = '';
    disconnected = false;
    accept(next);
  } catch (error) {
    if (version !== actionVersion) return;
    refreshError = error instanceof ServiceError ? error.message : `Cannot read the live experiment: ${error.message}`;
    disconnected = true;
    renderAll();
  } finally {
    refreshing = false;
  }
}

function accept(next) {
  const sameSession = state && next.instanceId === state.instanceId;
  if (sameSession && next.revision < state.revision) return;
  if (!sameSession) resetSession();
  state = next;
  const key = canCompare(state) ? `${state.baseline.id}|${state.result.id}` : '';
  if (key && key !== lastComparison && !modeChosen) mode = 'diff';
  lastComparison = key;
  renderAll();
}

function resetSession() {
  for (const side of SIDES) {
    if (drawn[side]) window.Plotly?.purge($(PLOT[side]));
    drawn[side] = null;
  }
  diffCache = { key: '', map: null };
  Object.assign(view, DEFAULT_VIEW);
  mode = 'side';
  modeChosen = false;
  lastComparison = '';
  syncViewLabels();
}

/* ---------- Small DOM helpers ---------- */

const keys = new WeakMap();

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function icon(name) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'i');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
}

function setText(node, text) {
  if (node.textContent !== text) node.textContent = text;
}

// Rebuild a region only when its inputs changed, so polling never disturbs focus or transitions.
function whenChanged(node, key, build) {
  if (keys.get(node) === key) return;
  keys.set(node, key);
  build();
}

/* ---------- Rendering ---------- */

function renderAll() {
  renderGuide();
  renderControls();
  renderPipeline();
  renderError();
  renderStage();
  renderChanges();
  renderCopilot();
  renderFile();
  renderTechnical();
  syncControls();
  syncViewLabels();
  queueImages();
}

function renderGuide() {
  const steps = stepStates(state);
  const list = $('steps');
  if (list.children.length !== steps.length) {
    list.replaceChildren(...steps.map(() => {
      const item = el('li', 'step');
      item.append(el('span', 'step-badge'), el('span', 'step-title'));
      return item;
    }));
  }
  steps.forEach((step, index) => {
    const item = list.children[index];
    const [badge, title] = item.children;
    item.dataset.state = step.state;
    if (step.state === 'current') item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
    whenChanged(badge, step.state, () => badge.replaceChildren(step.state === 'done' ? icon('check') : String(index + 1)));
    whenChanged(title, `${step.state}|${step.title}`, () => {
      title.replaceChildren(...(step.state === 'done' ? [el('span', 'visually-hidden', 'Done: ')] : []), step.title);
    });
  });
  const now = currentStep(state);
  setText($('step-now'), `Step ${now + 1} of ${steps.length} · ${steps[now].title}`);
  setText($('coach'), coachLine(shownState()));
}

function renderControls() {
  const live = shownState();
  const fieldset = $('presets');
  fieldset.disabled = !live || disconnected || live.status === 'running';
  for (const preset of state?.presets ?? []) {
    const name = $(`preset-${preset.id}-name`);
    if (!name) continue;
    setText(name, preset.label);
    setText($(`preset-${preset.id}-blurb`), presetBlurb(preset));
  }
  // Leave the radios alone while a change is in flight so the chosen card does not flicker back.
  if (!requesting) for (const input of fieldset.querySelectorAll('input[name="preset"]')) input.checked = input.value === state?.selectedPreset;

  setText($('run-label'), runButtonLabel(live));
  const kept = isKept();
  setText($('pin-label'), kept ? 'Reference kept' : pendingPin ? 'Keeping…' : 'Keep as reference');
  $('pin').querySelector('use').setAttribute('href', kept ? '#i-check' : '#i-bookmark');

  let line;
  let tone = '';
  if (disconnected) {
    line = OFFLINE_STATUS;
    tone = 'bad';
  } else if (actionError) {
    line = 'The action did not complete.';
    tone = 'bad';
  } else {
    line = statusLine(live);
    if (live?.status === 'failed') tone = 'bad';
  }
  setText($('status'), line);
  $('status').dataset.tone = tone;
}

function renderPipeline() {
  const list = $('pipeline');
  const stages = stageStates(shownState());
  if (list.children.length !== stages.length) {
    list.replaceChildren(...stages.map((stage) => {
      const item = el('li', 'stage-chip');
      item.dataset.stage = stage.key;
      const label = el('span');
      label.append(stage.label, el('span', 'visually-hidden'));
      item.append(el('span', 'stage-dot'), label);
      return item;
    }));
  }
  const spoken = { done: ', done', active: ', in progress', waiting: '' };
  stages.forEach((stage, index) => {
    const item = list.children[index];
    const [dot, label] = item.children;
    item.dataset.state = stage.state;
    if (stage.state === 'active') item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
    whenChanged(dot, stage.state, () => dot.replaceChildren(...(stage.state === 'done' ? [icon('check')] : [])));
    setText(label.lastElementChild, spoken[stage.state]);
  });
}

function renderError() {
  setText($('error'), refreshError || actionError || drawError || (state?.status === 'failed' ? state.error ?? '' : ''));
}

function setFrame(side, hasImage) {
  const pane = $(PANE[side]);
  const frame = pane.querySelector('.frame');
  $(PLOT[side]).hidden = !hasImage;
  frame.toggleAttribute('data-empty', !hasImage);
  if (hasImage) frame.tabIndex = 0;
  else frame.removeAttribute('tabindex');
  pane.querySelector('.chip').hidden = !hasImage;
  const empty = pane.querySelector('.empty');
  if (empty) empty.hidden = hasImage;
}

function renderStage() {
  const compare = canCompare(state);
  const shown = effectiveMode();
  const panes = $('panes');
  panes.dataset.mode = shown;
  panes.toggleAttribute('data-busy', shownState()?.status === 'running');
  $('pane-difference').hidden = shown !== 'diff';
  $('slide-layer').hidden = shown !== 'slide';
  for (const input of document.querySelectorAll('input[name="mode"]')) {
    input.checked = input.value === shown;
    if (input.value === 'side') continue;
    input.disabled = !compare;
    input.closest('label').title = compare ? '' : COMPARE_HINT;
  }

  const reference = state?.baseline;
  const latest = state?.result;
  setFrame('baseline', Boolean(reference));
  setFrame('current', Boolean(latest));
  setFrame('difference', compare && shown === 'diff');
  setText($('baseline-label'), reference?.label ?? '');
  setText($('current-title'), compare ? 'New scan' : 'Latest scan');
  setText($('current-label'), latest?.label ?? '');
  setText($('baseline-caption'), reference ? `Run ${shortId(reference.id)}` : '');
  setText($('current-caption'), latest ? `Run ${shortId(latest.id)}` : '');

  const map = getDifference();
  setText($('legend-max'), !map ? '' : map.max === 0 ? 'No pixel differs' : `${Math.round(map.scaleMax * 100)}% change`);
  $('difference-caption').hidden = !map;
}

function renderChanges() {
  const change = describeChange(state?.changes);
  const step = currentStep(state);
  whenChanged($('changes-body'), JSON.stringify([change, step]), () => {
    if (!change) {
      $('changes-body').replaceChildren(el('p', 'hint', step === 0
        ? 'Nothing to compare yet. Take a scan, keep it as your reference, then scan again with some movement. This card shows exactly what the movement changed.'
        : 'Keep this scan as your reference, then scan again with some movement. This card will show exactly what changed.'));
      return;
    }
    const headline = el('p', 'change-headline');
    headline.dataset.kind = change.kind;
    const tone = el('span', 'tone');
    tone.setAttribute('aria-hidden', 'true');
    headline.append(tone, el('span', '', change.headline));
    const nodes = [headline];
    if (change.rows.length) {
      const list = el('dl', 'change-rows');
      for (const row of change.rows) {
        const item = el('div', 'change-row');
        item.append(el('dt', '', row.label), el('dd', 'value', row.value), el('dd', 'note', row.note));
        list.append(item);
      }
      nodes.push(list);
    }
    $('changes-body').replaceChildren(...nodes);
  });
}

function renderCopilot() {
  const prompts = suggestedPrompts(state);
  whenChanged($('prompts'), JSON.stringify(prompts), () => {
    $('prompts').replaceChildren(...prompts.map((prompt) => {
      const item = el('li', 'prompt');
      const body = el('div');
      const text = el('p', '', prompt.text);
      text.title = prompt.text;
      body.append(el('strong', '', prompt.label), text);
      const button = el('button', 'copy-btn');
      button.type = 'button';
      button.setAttribute('aria-label', `Copy prompt: ${prompt.label}`);
      button.append(icon('copy'), 'Copy');
      button.addEventListener('click', () => copyText(prompt.text, 'Copied. Paste it into Copilot.'));
      item.append(body, button);
      return item;
    }));
  });

  const note = buildPullRequestNote(state);
  setText($('pr-preview'), note ?? 'Take a scan to write a note for a pull request.');
  $('copy-pr').disabled = !note;
  $('export').disabled = !state?.result || shownState()?.status === 'running';

  const entries = recentActivity(state, 8);
  const bucket = Math.floor(Date.now() / 5000);
  whenChanged($('activity'), `${state?.instanceId}|${state?.revision}|${bucket}`, () => {
    $('activity').replaceChildren(...(entries.length ? entries.map((entry) => {
      const item = el('li', 'feed-item');
      item.dataset.actor = entry.actor;
      const dot = el('span', 'feed-dot');
      dot.setAttribute('aria-hidden', 'true');
      const when = el('time', '', relativeTime(entry.at));
      when.dateTime = entry.at;
      item.append(dot, el('span', 'feed-text', entry.text), when);
      return item;
    }) : [el('li', 'feed-empty', 'Nothing yet. Actions from you and from Copilot will show up here.')]));
  });
}

function renderFile() {
  const select = $('inspect-side');
  select.querySelector('option[value="baseline"]').disabled = !state?.baseline;
  select.disabled = !state?.baseline;
  if (!state?.baseline && select.value === 'baseline') select.value = 'current';

  const target = inspected();
  const check = savedFileCheck(target);
  $('integrity-title').closest('.check').dataset.tone = !check ? 'idle' : check.ok ? 'good' : 'bad';
  $('integrity-icon').querySelector('use').setAttribute('href', `#i-${!check ? 'minus' : check.ok ? 'check' : 'alert'}`);
  setText($('integrity-title'), check?.title ?? 'No scan yet');
  setText($('integrity-detail'), check?.detail
    ?? 'After your first scan, ScanLab saves it as a DICOM file, opens the file again and checks every pixel. The result appears here.');
  $('integrity-rounding').hidden = !check;
  setText($('integrity-rounding'), check?.rounding ?? '');
  $('download-dicom').disabled = !target?.dicom;
}

function fact(label, value, plain = false) {
  const wrapper = document.createDocumentFragment();
  const term = el('dt', '', label);
  const detail = el('dd', plain ? 'plain' : '', value);
  wrapper.append(term, detail);
  return wrapper;
}

function renderTechnical() {
  const target = inspected();
  const reference = state?.baseline;
  setText($('inspect-note'), target
    ? `Showing the details of ${target === reference && target !== state.result ? 'the reference' : 'this scan'}.`
    : 'Take a scan to see its details.');
  whenChanged($('technical'), `${target?.id}|${reference?.id}`, () => {
    if (!target) {
      $('evidence').replaceChildren();
      $('dicom-tags').replaceChildren();
      $('provenance').textContent = 'Take a scan to see how it was made.';
      return;
    }
    const dicom = target.dicom ?? {};
    const rows = [
      fact('Run ID', target.id),
      ...(reference ? [fact('Reference run ID', reference.id)] : []),
      fact('Started by', actorName(target.requestedBy), true),
      fact('DICOM file fingerprint (SHA-256)', dicom.fileHash ?? '—'),
      fact('Reopened pixels fingerprint (SHA-256)', dicom.decodedPixelHash ?? '—'),
      ...(reference ? [fact('Reference file fingerprint (SHA-256)', reference.dicom?.fileHash ?? '—')] : []),
      fact('Time to compute', `${Number(target.computeSeconds).toFixed(2)} s`, true),
      fact('Time to save and reopen', `${Number(target.roundtripSeconds).toFixed(2)} s`, true)
    ];
    $('evidence').replaceChildren(...rows);
    $('dicom-tags').replaceChildren(...(dicom.tags ?? []).map((entry) => {
      const row = el('tr');
      row.append(el('td', 'mono', entry.tag), el('td', '', entry.name), el('td', '', String(entry.value)));
      return row;
    }));
    const { figure, pixels, ...rest } = target;
    $('provenance').textContent = JSON.stringify({ ...rest, dicom: { ...rest.dicom, fileBase64: undefined } }, null, 2);
  });
}

const viewControls = ['zoom-out', 'zoom-in', 'brightness', 'contrast', 'reset-view'];

function syncControls() {
  const running = shownState()?.status === 'running';
  const busy = requesting || running;
  $('run').disabled = !state || disconnected;
  $('run').setAttribute('aria-disabled', String(busy));
  $('run').setAttribute('aria-busy', String(running));
  $('pin').disabled = busy || disconnected || !state?.result || isKept();
  for (const id of viewControls) $(id).disabled = !state?.result;
}

function syncViewLabels() {
  setText($('zoom-label'), `${Number(view.zoom.toFixed(2))}×`);
  $('brightness').value = String(view.brightness);
  $('contrast').value = String(view.contrast);
  const shift = view.brightness > 0 ? `+${view.brightness}` : view.brightness < 0 ? `−${Math.abs(view.brightness)}` : '0';
  setText($('brightness-value'), shift);
  setText($('contrast-value'), `${view.contrast}%`);
  $('brightness').setAttribute('aria-valuetext', view.brightness === 0 ? 'Normal' : view.brightness > 0 ? `Brighter by ${view.brightness}` : `Darker by ${Math.abs(view.brightness)}`);
  $('contrast').setAttribute('aria-valuetext', `${view.contrast} percent`);
  $('panes').toggleAttribute('data-zoomed', view.zoom > 1);
}

/* ---------- Images ---------- */

let imageChain = Promise.resolve();

function setDrawError(message) {
  if (drawError === message) return;
  drawError = message;
  renderError();
}

function queueImages() {
  imageChain = imageChain.then(renderImages).then(() => setDrawError(''), (error) => {
    console.error(error);
    setDrawError('The images could not be drawn. Reload this page.');
  });
}

function layoutFor(size) {
  const range = viewRange(size, view);
  const axis = { visible: false, fixedrange: true, showgrid: false, zeroline: false, constrain: 'domain' };
  return {
    autosize: true,
    margin: { l: 0, r: 0, t: 0, b: 0, pad: 0 },
    paper_bgcolor: '#050608',
    plot_bgcolor: '#050608',
    xaxis: { ...axis, range: range.x },
    yaxis: { ...axis, range: range.y, scaleanchor: 'x' }
  };
}

function grayTrace(result) {
  const z = zOf(result);
  if (!Array.isArray(z)) return null;
  const { zmin, zmax } = grayWindow(view);
  return { size: z.length, trace: { type: 'heatmap', z, zmin, zmax, colorscale: GRAY, showscale: false, hoverinfo: 'skip', transpose: false } };
}

function heatTrace() {
  const map = getDifference();
  if (!map) return null;
  return { size: map.z.length, trace: { type: 'heatmap', z: map.z, zmin: 0, zmax: map.scaleMax, colorscale: HEAT, showscale: false, hoverinfo: 'skip', transpose: false }, map };
}

function develop(plot) {
  plot.removeAttribute('data-develop');
  void plot.offsetWidth;
  plot.setAttribute('data-develop', '');
  plot.addEventListener('animationend', (event) => {
    if (event.target === plot) plot.removeAttribute('data-develop');
  }, { once: true });
}

async function renderImages() {
  if (!state) return;
  const Plotly = window.Plotly;
  if (!Plotly) throw new Error('The image viewer did not load.');
  const reference = state.baseline;
  const latest = state.result;
  const compare = canCompare(state);
  const jobs = [
    { side: 'baseline', key: reference?.id ?? null, visible: true, build: () => grayTrace(reference) },
    { side: 'current', key: latest?.id ?? null, visible: true, build: () => grayTrace(latest) },
    { side: 'difference', key: compare ? `${reference.id}|${latest.id}` : null, visible: effectiveMode() === 'diff', build: heatTrace }
  ];
  for (const job of jobs) {
    const plot = $(PLOT[job.side]);
    if (job.key === null) {
      if (drawn[job.side]) Plotly.purge(plot);
      drawn[job.side] = null;
      continue;
    }
    if (!job.visible || drawn[job.side] === job.key) continue;
    const built = job.build();
    if (!built) continue;
    await Plotly.react(plot, [built.trace], layoutFor(built.size), PLOT_CONFIG);
    drawn[job.side] = job.key;
    if (built.map) {
      plot.dataset.max = String(built.map.max);
      plot.dataset.scaleMax = String(built.map.scaleMax);
    }
    develop(plot);
  }
}

let viewFrame = 0;

function scheduleView() {
  if (viewFrame) return;
  viewFrame = requestAnimationFrame(() => {
    viewFrame = 0;
    applyView();
  });
}

function applyView() {
  const Plotly = window.Plotly;
  if (!Plotly) return;
  const { zmin, zmax } = grayWindow(view);
  for (const side of SIDES) {
    const plot = $(PLOT[side]);
    if (!drawn[side] || !plot.data || plot.clientWidth === 0) continue;
    const range = viewRange(plot.data[0].z.length, view);
    const layout = { 'xaxis.range': range.x, 'yaxis.range': range.y };
    if (side === 'difference') Plotly.relayout(plot, layout);
    else Plotly.update(plot, { zmin, zmax }, layout);
  }
}

const resizing = new Set();

function scheduleResize(plot) {
  if (resizing.has(plot)) return;
  resizing.add(plot);
  requestAnimationFrame(() => {
    resizing.delete(plot);
    if (!window.Plotly || !plot.data || plot.clientWidth === 0) return;
    Promise.resolve(window.Plotly.Plots.resize(plot)).then(scheduleView, () => {});
  });
}

const observer = new ResizeObserver((entries) => entries.forEach((entry) => scheduleResize(entry.target)));
for (const side of SIDES) observer.observe($(PLOT[side]));

/* ---------- Zoom, pan, brightness, hover ---------- */

function clampPan() {
  const limit = panLimit(imageSize(), view.zoom);
  view.panX = clamp(view.panX, -limit, limit);
  view.panY = clamp(view.panY, -limit, limit);
}

function setZoom(next) {
  view.zoom = clamp(Math.round(next / ZOOM.step) * ZOOM.step, ZOOM.min, ZOOM.max);
  clampPan();
  syncViewLabels();
  scheduleView();
}

function resetView() {
  Object.assign(view, DEFAULT_VIEW);
  syncViewLabels();
  scheduleView();
}

function panBy(cellsX, cellsY) {
  view.panX += cellsX;
  view.panY += cellsY;
  clampPan();
  scheduleView();
}

const panes = $('panes');
let drag = null;

function frameOf(event) {
  return event.target.closest?.('.frame') ?? null;
}

panes.addEventListener('pointerdown', (event) => {
  const frame = frameOf(event);
  if (!frame || event.button !== 0 || view.zoom <= 1 || frame.hasAttribute('data-empty')) return;
  drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, panX: view.panX, panY: view.panY, frame };
  frame.setPointerCapture(event.pointerId);
  frame.focus({ preventScroll: true });
  panes.setAttribute('data-dragging', '');
});

panes.addEventListener('pointermove', (event) => {
  if (drag && event.pointerId === drag.pointerId) {
    const cellsPerPixel = imageSize() / view.zoom / drag.frame.clientWidth;
    view.panX = drag.panX - (event.clientX - drag.x) * cellsPerPixel;
    view.panY = drag.panY + (event.clientY - drag.y) * cellsPerPixel;
    clampPan();
    scheduleView();
  }
  updateHover(event);
});

function endDrag(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  drag = null;
  panes.removeAttribute('data-dragging');
}

panes.addEventListener('pointerup', endDrag);
panes.addEventListener('pointercancel', endDrag);
panes.addEventListener('pointerleave', () => { if (!drag) clearHover(); });

panes.addEventListener('keydown', (event) => {
  const frame = frameOf(event);
  if (!frame || event.altKey || event.ctrlKey || event.metaKey) return;
  const step = event.shiftKey ? 12 : 4;
  const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
  if (moves[event.key]) {
    if (view.zoom <= 1) return;
    event.preventDefault();
    panBy(...moves[event.key]);
  } else if (event.key === '+' || event.key === '=') {
    event.preventDefault();
    setZoom(view.zoom + ZOOM.step);
  } else if (event.key === '-' || event.key === '_') {
    event.preventDefault();
    setZoom(view.zoom - ZOOM.step);
  } else if (event.key === '0') {
    event.preventDefault();
    resetView();
  }
});

function clearHover() {
  for (const mark of panes.querySelectorAll('.crosshair')) mark.hidden = true;
  setText($('readout'), IDLE_READOUT);
  $('readout').setAttribute('data-idle', '');
}

function updateHover(event) {
  const frame = frameOf(event);
  const latest = state?.result;
  if (!frame || frame.hasAttribute('data-empty') || !latest) return clearHover();
  const size = imageSize();
  const bounds = frame.getBoundingClientRect();
  const x = (event.clientX - bounds.left - frame.clientLeft) / frame.clientWidth;
  const y = (event.clientY - bounds.top - frame.clientTop) / frame.clientHeight;
  const range = viewRange(size, view);
  const cell = cellAt(range, x, y, size);
  if (!cell) return clearHover();
  const now = zOf(latest)?.[cell.row]?.[cell.column];
  const before = canCompare(state) ? zOf(state.baseline)?.[cell.row]?.[cell.column] : undefined;
  setText($('readout'), readoutText(before, now));
  $('readout').removeAttribute('data-idle');
  const left = `${((cell.column - range.x[0]) / (range.x[1] - range.x[0])) * 100}%`;
  const top = `${((range.y[1] - cell.row) / (range.y[1] - range.y[0])) * 100}%`;
  for (const other of panes.querySelectorAll('.frame:not([data-empty])')) {
    const mark = other.querySelector('.crosshair');
    mark.style.left = left;
    mark.style.top = top;
    mark.hidden = false;
  }
}

$('zoom-in').addEventListener('click', () => setZoom(view.zoom + ZOOM.step));
$('zoom-out').addEventListener('click', () => setZoom(view.zoom - ZOOM.step));
$('reset-view').addEventListener('click', resetView);
$('brightness').addEventListener('input', (event) => {
  view.brightness = Number(event.target.value);
  syncViewLabels();
  scheduleView();
});
$('contrast').addEventListener('input', (event) => {
  view.contrast = Number(event.target.value);
  syncViewLabels();
  scheduleView();
});

for (const input of document.querySelectorAll('input[name="mode"]')) {
  input.addEventListener('change', () => {
    mode = input.value;
    modeChosen = true;
    clearHover();
    renderAll();
  });
}

/* ---------- Slide compare ---------- */

const handle = $('slide-handle');
let sliding = false;

function setSplit(value) {
  split = clamp(value, 0, 100);
  panes.style.setProperty('--split', `${split}%`);
  const now = Math.round(split);
  handle.setAttribute('aria-valuenow', String(now));
  handle.setAttribute('aria-valuetext', `${now}% reference · ${100 - now}% new scan`);
}

function moveSplit(event) {
  const bounds = $('slide-layer').getBoundingClientRect();
  setSplit(((event.clientX - bounds.left) / bounds.width) * 100);
}

handle.addEventListener('pointerdown', (event) => {
  sliding = true;
  handle.setPointerCapture(event.pointerId);
  handle.focus({ preventScroll: true });
  event.preventDefault();
  moveSplit(event);
});
handle.addEventListener('pointermove', (event) => { if (sliding) moveSplit(event); });
handle.addEventListener('pointerup', () => { sliding = false; });
handle.addEventListener('pointercancel', () => { sliding = false; });
handle.addEventListener('keydown', (event) => {
  const amount = event.shiftKey ? 10 : 2;
  const next = { ArrowLeft: split - amount, ArrowDown: split - amount, ArrowRight: split + amount, ArrowUp: split + amount, Home: 0, End: 100 }[event.key];
  if (next === undefined) return;
  event.preventDefault();
  setSplit(next);
});

/* ---------- Actions ---------- */

// Actions run one at a time, in the order they were chosen, so a quick second click is never lost.
// If one fails, the ones queued behind it are skipped and the error is shown.
function act(task) {
  queued += 1;
  requesting = true;
  actionVersion += 1;
  actionError = '';
  renderAll();
  lastAction = lastAction.then(async () => {
    try {
      if (!actionError) await task();
    } catch (error) {
      actionError = error.message;
    } finally {
      queued -= 1;
      requesting = queued > 0;
      renderAll();
    }
  });
  return lastAction;
}

function reportAction(message) {
  actionError = message;
  renderAll();
}

$('presets').addEventListener('change', (event) => {
  if (event.target.name !== 'preset') return;
  act(async () => accept(await api('preset', { preset: event.target.value })));
});

$('run').addEventListener('click', () => {
  if (!state || state.status === 'running' || pendingRun) return;
  pendingRun = true;
  act(async () => {
    await api('run', { preset: state.selectedPreset });
    await refresh({ force: true });
  }).finally(() => {
    pendingRun = false;
    renderAll();
  });
});

$('pin').addEventListener('click', () => {
  if (!state?.result) return;
  const hadFocus = document.activeElement === $('pin');
  pendingPin = true;
  act(async () => {
    accept(await api('pin', { runId: state.result.id }));
  }).then(() => {
    pendingPin = false;
    renderAll();
    if (hadFocus && !$('run').disabled) $('run').focus();
  });
});

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

$('download-dicom').addEventListener('click', async () => {
  const target = inspected();
  if (!target) return;
  try {
    const response = await fetch(`/api/dicom/${target.id}`, { headers: { 'x-scanlab-token': token }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error?.message || `Request failed (${response.status}).`);
    }
    saveBlob(await response.blob(), `scanlab-${target.id}.dcm`);
  } catch (error) {
    reportAction(`Could not download DICOM: ${error.message}`);
  }
});

$('export').addEventListener('click', async () => {
  if (!state?.result) return;
  const id = state.result.id;
  try {
    const body = await api('compare');
    saveBlob(new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' }), `scanlab-${id}.json`);
  } catch (error) {
    reportAction(`Could not save the comparison: ${error.message}`);
  }
});

$('inspect-side').addEventListener('change', () => {
  renderFile();
  renderTechnical();
});

let toastTimer = 0;

function toast(message) {
  const node = $('toast');
  node.textContent = message;
  node.setAttribute('data-show', '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    node.removeAttribute('data-show');
    toastTimer = setTimeout(() => { node.textContent = ''; }, 400);
  }, 3200);
}

function legacyCopy(text) {
  const previous = document.activeElement;
  const area = Object.assign(document.createElement('textarea'), { value: text });
  area.setAttribute('readonly', '');
  area.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
  document.body.append(area);
  area.select();
  let copied = false;
  try { copied = document.execCommand('copy'); } catch { copied = false; }
  area.remove();
  previous?.focus?.();
  return copied;
}

async function copyText(text, message) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    toast(message);
  } catch {
    toast(legacyCopy(text) ? message : 'Could not copy. Select the text and copy it yourself.');
  }
}

$('copy-pr').addEventListener('click', () => copyText(buildPullRequestNote(state), 'Copied. Paste it into your pull request.'));

/* ---------- Technical details tabs ---------- */

const tabs = [...document.querySelectorAll('[role="tab"]')];

function selectTab(tab, { focus = false } = {}) {
  for (const item of tabs) {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    $(item.getAttribute('aria-controls')).hidden = !selected;
  }
  if (focus) tab.focus();
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', (event) => {
    const target = {
      ArrowRight: tabs[(index + 1) % tabs.length],
      ArrowLeft: tabs[(index - 1 + tabs.length) % tabs.length],
      Home: tabs[0],
      End: tabs.at(-1)
    }[event.key];
    if (!target) return;
    event.preventDefault();
    selectTab(target, { focus: true });
  });
});

/* ---------- Start ---------- */

async function pollLoop() {
  clearTimeout(pollTimer);
  if (!requesting) await refresh();
  pollTimer = setTimeout(pollLoop, state?.status === 'running' ? POLL_RUNNING_MS : POLL_IDLE_MS);
}

setSplit(50);
renderAll();
await refresh();
pollLoop();
