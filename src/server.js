import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createRequestStore, InputError } from './requests.js';

const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']]
]);
const bodyLimit = 16 * 1024;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function json(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

async function parseBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > bodyLimit) throw new HttpError(413, 'Request body is too large.');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    throw new HttpError(400, 'Request body must be valid JSON.');
  }
}

export function createApp({ store = createRequestStore(), logger = console } = {}) {
  return createServer(async (request, response) => {
    response.setHeader('x-content-type-options', 'nosniff');
    response.setHeader('cache-control', 'no-store');
    response.setHeader('content-security-policy', "default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname;
      if (pathname === '/api/requests') {
        if (request.method === 'GET') {
          json(response, 200, { requests: store.list() });
        } else if (request.method === 'POST') {
          if (request.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') {
            throw new HttpError(415, 'Content-Type must be application/json.');
          }
          json(response, 201, { request: store.create(await parseBody(request)) });
        } else {
          response.setHeader('allow', 'GET, POST');
          throw new HttpError(405, 'Method not allowed.');
        }
      } else if (assets.has(pathname)) {
        if (request.method !== 'GET') {
          response.setHeader('allow', 'GET');
          throw new HttpError(405, 'Method not allowed.');
        }
        const [filename, contentType] = assets.get(pathname);
        const content = await readFile(new URL(`../public/${filename}`, import.meta.url));
        response.writeHead(200, { 'content-type': contentType });
        response.end(content);
      } else {
        throw new HttpError(404, 'Not found.');
      }
    } catch (error) {
      if (error instanceof InputError) {
        json(response, 400, { error: { field: error.field, message: error.message } });
      } else if (error instanceof HttpError) {
        json(response, error.status, { error: { message: error.message } });
      } else {
        logger.error('Request failed:', error);
        json(response, 500, { error: { message: 'An unexpected server error occurred.' } });
      }
    }
  });
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('PORT must be an integer between 1 and 65535.');
    process.exitCode = 1;
  } else {
    const app = createApp();
    app.on('error', (error) => {
      console.error('Server failed:', error);
      process.exitCode = 1;
    });
    app.listen(port, '127.0.0.1', () => {
      console.log(`Request demo: http://127.0.0.1:${port}`);
    });
  }
}
