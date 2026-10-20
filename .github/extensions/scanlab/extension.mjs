import { fileURLToPath } from 'node:url';

console.error('[scanlab] Loading the host Canvas SDK.');
const { joinSession, createCanvas, CanvasError } = await import('@github/copilot-sdk/extension');
console.error('[scanlab] Loading the local Canvas adapter.');
const { makeCanvas } = await import('./canvas.mjs');
const root = fileURLToPath(new URL('../../../', import.meta.url));
let session;
const canvas = makeCanvas({
  createCanvas, CanvasError, root,
  log: (message) => session?.log(message)
});
console.error('[scanlab] Registering the Canvas; no simulation starts until opened.');
session = await joinSession({ canvases: [canvas] });
console.error('[scanlab] Canvas registered.');
