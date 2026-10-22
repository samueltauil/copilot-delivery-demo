// Plain-language logic shared by the browser app, the Copilot Canvas and the tests.
// Nothing here touches the DOM: every export is a pure function of the live state.

export const PRACTICE_DATA_NOTICE = 'Practice data · not for medical use';

export const STEPS = [
  { title: 'Take a scan' },
  { title: 'Keep it as your reference' },
  { title: 'Scan again with movement' },
  { title: 'See what changed' }
];

export const STAGES = [
  { key: 'simulating', label: 'Simulate the scan' },
  { key: 'writing', label: 'Save as DICOM file' },
  { key: 'reopening', label: 'Open the file again' },
  { key: 'verifying', label: 'Check every pixel' }
];

const PEOPLE = {
  you: { name: 'You', possessive: 'Your', by: 'you' },
  copilot: { name: 'Copilot', possessive: 'Copilot’s', by: 'Copilot' },
  script: { name: 'A script', possessive: 'A script’s', by: 'a script' }
};

export const actorKey = (actor) => (Object.hasOwn(PEOPLE, actor) ? actor : 'script');
export const actorName = (actor) => PEOPLE[actorKey(actor)].name;

export const shortId = (id) => String(id ?? '').slice(0, 8);
export const fingerprint = (hash) => (hash ? `${String(hash).slice(0, 12)}…` : '—');

export function presetFor(state, id) {
  return state?.presets?.find((preset) => preset.id === id);
}

export function presetBlurb(preset) {
  if (!preset) return '';
  return preset.motionMm === 0 ? 'Perfectly still. Best for a reference.' : `Head moves ${preset.motionMm} mm during the scan.`;
}

export const canCompare = (state) => Boolean(state?.result && state?.baseline && state.baseline.id !== state.result.id);

export function currentStep(state) {
  if (!state?.result) return 0;
  if (!state.baseline) return 1;
  return state.baseline.id === state.result.id ? 2 : 3;
}

export function stepStates(state) {
  const current = currentStep(state);
  return STEPS.map((step, index) => ({ ...step, state: index < current ? 'done' : index === current ? 'current' : 'todo' }));
}

export function runButtonLabel(state) {
  if (state?.status === 'running') return 'Scanning…';
  return state?.result ? 'Scan again' : 'Take scan';
}

export function coachLine(state) {
  if (state?.status === 'running') {
    return state.result
      ? 'Scanning on this computer. The image on screen is the previous scan, not this one.'
      : 'Scanning on this computer. This takes a few seconds.';
  }
  if (state?.status === 'failed') return 'That scan did not finish. Any image on screen is from the previous scan. Try again.';
  switch (currentStep(state)) {
    case 0:
      return 'Choose how much the head moves, then press Take scan. No motion makes the cleanest reference.';
    case 1:
      return state.result.preset === 'still'
        ? 'Press Keep as reference to save this scan as the one to compare against.'
        : 'Press Keep as reference to compare against this scan. No motion makes the cleanest reference.';
    case 2:
      return state.selectedPreset === state.baseline.preset
        ? 'Reference saved. Choose a different movement, then press Scan again.'
        : 'Reference saved. Press Scan again to see what that movement changes.';
    default:
      return state.changes?.identical
        ? 'These two scans are identical. Choose a different movement and scan again.'
        : 'Here is what the movement did. Try the Slide and What changed views, and zoom in on the edges.';
  }
}

export function statusLine(state) {
  if (!state) return 'Connecting to the live experiment…';
  if (state.status === 'running') {
    const label = presetFor(state, state.selectedPreset)?.label;
    return label ? `Scanning “${label}” on this computer…` : 'Scanning on this computer…';
  }
  if (state.status === 'failed') return 'The scan did not finish. Any image on screen is from the previous scan.';
  const result = state.result;
  if (!result) return 'Ready. Nothing has been scanned yet.';
  const seconds = (result.computeSeconds ?? 0) + (result.roundtripSeconds ?? 0);
  const by = result.requestedBy && result.requestedBy !== 'you' ? ` · started by ${PEOPLE[actorKey(result.requestedBy)].by}` : '';
  return `Scan complete${by} · computed live on this computer in ${seconds.toFixed(1)} s`;
}

// Where a stage stands: done, active (the running one), or waiting.
export function stageStates(state) {
  const active = STAGES.findIndex((stage) => stage.key === state?.stage);
  return STAGES.map((stage, index) => ({
    ...stage,
    state: state?.status === 'succeeded' || (state?.status === 'running' && index < active) ? 'done'
      : state?.status === 'running' && index === active ? 'active' : 'waiting'
  }));
}

export function formatPercent(value) {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0%';
  if (value < 0.1) return '<0.1%';
  if (value < 9.95) return `${value.toFixed(1)}%`;
  return `${Math.round(value)}%`;
}

// Rounding errors are tiny, so keep two significant digits instead of rounding them away.
export function formatTinyPercent(value) {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0%';
  if (value < 1e-6) return '<0.000001%';
  return `${Number(value.toPrecision(2))}%`;
}

export function describeChange(changes) {
  if (!changes) return null;
  if (changes.sameRun) {
    return { kind: 'same-run', headline: 'This is the reference itself, so nothing differs yet. Scan again with a movement to compare.', rows: [] };
  }
  if (changes.identical) {
    return { kind: 'identical', headline: 'No pixel is different. These two scans are the same picture.', rows: [] };
  }
  const threshold = `${Math.round(changes.threshold * 100)}%`;
  const rows = [
    { label: 'Picture changed', value: formatPercent(changes.changedPixelsPercent), note: `Pixels that moved by more than ${threshold} of the brightness range` },
    { label: 'Average change', value: formatPercent(changes.meanChangePercent), note: 'Across every pixel' },
    { label: 'Biggest change', value: formatPercent(changes.maxChangePercent), note: 'At the single most different pixel' }
  ];
  if (changes.changedPixels === 0) {
    return {
      kind: 'slight',
      headline: `Nothing changed noticeably. Some pixels differ slightly, by at most ${formatPercent(changes.maxChangePercent)} of the brightness range.`,
      rows
    };
  }
  return { kind: 'changed', headline: `${formatPercent(changes.changedPixelsPercent)} of the picture changed noticeably.`, rows };
}

export function savedFileCheck(result) {
  const dicom = result?.dicom;
  if (!dicom) return null;
  const levels = (2 ** (dicom.bitsStored ?? 16)).toLocaleString('en-US');
  const ok = dicom.storedPixelsExact === true && dicom.maxAbsoluteError <= dicom.errorBound;
  return {
    ok,
    title: ok ? 'Saved file checks out' : 'Saved file does not match',
    detail: ok
      ? 'We saved this scan as a DICOM file, opened the file again and compared every pixel. Every stored pixel came back identical.'
      : 'The reopened file differs from what was saved. Do not rely on this scan.',
    rounding: `Saving rounds each pixel to the nearest of ${levels} brightness levels. No pixel moved by more than ${formatTinyPercent(dicom.maxAbsoluteError * 100)} of the brightness range.`
  };
}

export function relativeTime(iso, now = Date.now()) {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return '';
  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

export function activitySentence(entry) {
  const person = PEOPLE[actorKey(entry?.actor)];
  const label = entry?.label ? `“${entry.label}”` : 'a scan';
  switch (entry?.kind) {
    case 'preset':
      return `${person.name} chose ${label}.`;
    case 'scan_started':
      return `${person.name} started a scan: ${label}.`;
    case 'scan_done': {
      const time = Number.isFinite(entry.computeSeconds) ? ` in ${entry.computeSeconds.toFixed(1)} s` : '';
      return `${person.possessive} scan finished: ${label}${time}.`;
    }
    case 'scan_failed':
      return `${person.possessive} scan failed: ${label}. The image on screen is not from that scan.`;
    case 'reference_kept':
      return `${person.name} kept ${label} as the reference.`;
    default:
      return `${person.name} did something this page does not recognize.`;
  }
}

export function recentActivity(state, limit = 8) {
  return (state?.activity ?? []).slice(-limit).reverse().map((entry) => ({
    actor: actorKey(entry.actor), at: entry.at, text: activitySentence(entry)
  }));
}

const QUOTE_NUMBERS = 'Quote the real run IDs and numbers.';

export function suggestedPrompts(state) {
  const checkFile = {
    label: 'Check the saved file',
    text: 'Use the ScanLab canvas to check the current scan’s saved DICOM file. Is it an exact copy of what was scanned? Answer in plain words and quote the real numbers.'
  };
  switch (currentStep(state)) {
    case 0:
      return [
        { label: 'Run the whole comparison', text: `Use the ScanLab canvas to run No motion, keep it as the reference, run Controlled shift, then explain in plain words what changed. ${QUOTE_NUMBERS}` },
        { label: 'Take the reference scan', text: 'Use the ScanLab canvas to take a No motion scan and keep it as the reference.' }
      ];
    case 1:
      return [
        { label: 'Compare against this scan', text: `Use the ScanLab canvas to keep the current scan as the reference, run Controlled shift, and explain in plain words what changed. ${QUOTE_NUMBERS}` },
        checkFile
      ];
    case 2:
      return [
        { label: 'Scan again and compare', text: `Use the ScanLab canvas to run Controlled shift and explain in plain words what changed compared with the reference. ${QUOTE_NUMBERS}` },
        { label: 'Try a bigger movement', text: `Use the ScanLab canvas to run Larger shift as well, and compare how much each movement changed the picture. ${QUOTE_NUMBERS}` }
      ];
    default:
      return [
        { label: 'Explain what changed', text: `Use the ScanLab canvas to read the comparison and explain in plain words what the movement changed. ${QUOTE_NUMBERS}` },
        { label: 'Write the pull request note', text: 'Use the ScanLab canvas to get the pull request note for this comparison, then tidy it into a short PR description. Practice data only: make no medical claims.' },
        checkFile
      ];
  }
}

function scanColumn(result, preset) {
  const movement = !preset ? result.label : preset.motionMm === 0 ? preset.label : `${preset.label} (${preset.motionMm} mm)`;
  return {
    Movement: movement,
    'Run ID': `\`${result.id}\``,
    'File fingerprint (SHA-256)': `\`${fingerprint(result.dicom?.fileHash)}\``,
    'Pixel fingerprint (SHA-256)': `\`${fingerprint(result.dicom?.decodedPixelHash)}\``
  };
}

// Markdown a person or Copilot can paste under "UI/API evidence" in a pull request.
export function buildPullRequestNote(state) {
  const result = state?.result;
  if (!result) return null;
  const reference = state.baseline && state.baseline.id !== result.id ? state.baseline : null;
  const columns = reference
    ? [['Reference', scanColumn(reference, presetFor(state, reference.preset))], ['New scan', scanColumn(result, presetFor(state, result.preset))]]
    : [['This scan', scanColumn(result, presetFor(state, result.preset))]];
  const rows = Object.keys(columns[0][1]);
  const lines = [
    '### ScanLab comparison',
    '',
    '> Practice data only. Not for medical use. Computed live on this computer; nothing was replayed.',
    '',
    `| | ${columns.map(([title]) => title).join(' | ')} |`,
    `| --- |${columns.map(() => ' --- |').join('')}`,
    ...rows.map((row) => `| ${row} | ${columns.map(([, values]) => values[row]).join(' | ')} |`),
    ''
  ];
  const change = reference ? describeChange(state.changes) : null;
  if (!reference) {
    lines.push(state.baseline ? '**What changed.** The reference is this scan, so there is nothing to compare yet.' : '**What changed.** No reference was kept, so nothing was compared.');
  } else if (change?.rows.length) {
    const [, average, biggest] = change.rows.map((row) => row.value);
    const threshold = `${Math.round(state.changes.threshold * 100)}%`;
    lines.push(`**What changed.** ${change.headline} A pixel counts as changed when it moves by more than ${threshold} of the brightness range. Average change ${average}; biggest change ${biggest}.`);
  } else if (change) {
    lines.push(`**What changed.** ${change.headline}`);
  }
  const check = savedFileCheck(result);
  if (check) lines.push('', `**Saved file check.** ${check.detail} ${check.rounding}`);
  const activity = recentActivity(state, 6).reverse();
  if (activity.length) lines.push('', '**Who did what.**', ...activity.map((entry) => `- ${entry.text}`));
  lines.push('', '_Fingerprints are shortened to 12 characters._');
  return lines.join('\n');
}

// Absolute brightness difference between two same-size images, plus a color-scale ceiling rounded up to the next 5%.
export function differenceMap(reference, current) {
  if (!Array.isArray(reference) || !Array.isArray(current) || reference.length !== current.length) return null;
  let max = 0;
  const z = [];
  for (let row = 0; row < current.length; row++) {
    if (current[row].length !== reference[row].length) return null;
    const values = current[row].map((value, column) => Math.abs(value - reference[row][column]));
    for (const value of values) if (value > max) max = value;
    z.push(values);
  }
  return { z, max, scaleMax: Math.max(0.05, Math.ceil(max * 20 - 1e-9) / 20) };
}

export const ZOOM = { min: 1, max: 4, step: 0.25 };
export const BRIGHTNESS = { min: -50, max: 50, step: 5 };
export const CONTRAST = { min: 50, max: 300, step: 5 };

export const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

// Brightness shifts the middle of the gray scale; contrast narrows it.
export function grayWindow({ brightness = 0, contrast = 100 } = {}) {
  const width = 1 / (clamp(contrast, CONTRAST.min, CONTRAST.max) / 100);
  const center = 0.5 - clamp(brightness, BRIGHTNESS.min, BRIGHTNESS.max) / 100;
  return { zmin: center - width / 2, zmax: center + width / 2 };
}

export function panLimit(size, zoom) {
  return size / 2 - size / (2 * clamp(zoom, ZOOM.min, ZOOM.max));
}

// Plotly axis ranges for an image of `size` pixels. Cells are centered on whole numbers.
export function viewRange(size, { zoom = 1, panX = 0, panY = 0 } = {}) {
  const level = clamp(zoom, ZOOM.min, ZOOM.max);
  const limit = panLimit(size, level);
  const x = clamp(panX, -limit, limit);
  const y = clamp(panY, -limit, limit);
  const center = (size - 1) / 2;
  const radius = size / (2 * level);
  return { x: [center + x - radius, center + x + radius], y: [center + y - radius, center + y + radius] };
}

// Which pixel is under a point? fractionX/Y run 0..1 from the pane's left/top edge.
export function cellAt(range, fractionX, fractionY, size) {
  if (!(fractionX >= 0 && fractionX <= 1 && fractionY >= 0 && fractionY <= 1)) return null;
  return {
    column: clamp(Math.round(range.x[0] + fractionX * (range.x[1] - range.x[0])), 0, size - 1),
    row: clamp(Math.round(range.y[1] - fractionY * (range.y[1] - range.y[0])), 0, size - 1)
  };
}

export function readoutText(reference, current) {
  const percent = (value) => `${Math.round(value * 100)}%`;
  if (!Number.isFinite(current)) return '';
  if (!Number.isFinite(reference)) return `Brightness ${percent(current)}`;
  const delta = Math.round((current - reference) * 100);
  const change = delta === 0 ? 'no change' : `${delta > 0 ? '+' : '−'}${Math.abs(delta)}%`;
  return `Reference ${percent(reference)} → New scan ${percent(current)} · ${change}`;
}
