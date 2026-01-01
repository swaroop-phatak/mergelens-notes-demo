/* global process, Buffer */
import { describe, it, expect, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { InMemoryStore } from '../store.mjs';
import { dispatchRequest } from '../routes.mjs';

function mockReq({ method = 'GET', url = '/', body = null } = {}) {
  const req = new EventEmitter();
  req.method = method;
  req.url = url;
  req.headers = { 'content-type': 'application/json' };
  process.nextTick(() => {
    if (body !== null) {
      req.emit('data', Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)));
    }
    req.emit('end');
  });
  return req;
}

function mockRes() {
  let statusCode = 200;
  const headers = {};
  let body = '';
  let onFinish = null;
  let finished = false;

  return {
    writeHead(code, h) {
      statusCode = code;
      if (h) Object.assign(headers, h);
      return this;
    },
    setHeader(name, val) {
      headers[name] = val;
    },
    end(data) {
      if (data) body += data;
      finished = true;
      if (onFinish) onFinish({ statusCode, headers, body });
    },
    waitForResponse() {
      if (finished) return Promise.resolve({ statusCode, headers, body });
      return new Promise((resolve) => {
        onFinish = resolve;
      });
    },
  };
}

describe('Notes API Handlers (In-Memory)', () => {
  let store;

  beforeEach(() => {
    store = new InMemoryStore();
  });

  it('GET /api/health returns 200 with ok status', async () => {
    const req = mockReq({ method: 'GET', url: '/api/health' });
    const res = mockRes();
    await dispatchRequest(req, res, store);
    const { statusCode, body } = await res.waitForResponse();
    expect(statusCode).toBe(200);
    const json = JSON.parse(body);
    expect(json.status).toBe('ok');
  });

  it('GET /api/notes returns empty list initially', async () => {
    const req = mockReq({ method: 'GET', url: '/api/notes' });
    const res = mockRes();
    await dispatchRequest(req, res, store);
    const { statusCode, body } = await res.waitForResponse();
    expect(statusCode).toBe(200);
    const json = JSON.parse(body);
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBe(0);
  });

  it('POST /api/notes creates a valid note', async () => {
    const req = mockReq({
      method: 'POST',
      url: '/api/notes',
      body: { text: 'Hello MergeLens' },
    });
    const res = mockRes();
    await dispatchRequest(req, res, store);
    const { statusCode, body } = await res.waitForResponse();
    expect(statusCode).toBe(201);
    const json = JSON.parse(body);
    expect(json.text).toBe('Hello MergeLens');
    expect(json.id).toBeDefined();
    expect(json.createdAt).toBeDefined();
  });

  it('GET /api/notes retrieves saved notes', async () => {
    await store.addNote({ id: 'n1', text: 'Existing Note', createdAt: new Date().toISOString() });
    const req = mockReq({ method: 'GET', url: '/api/notes' });
    const res = mockRes();
    await dispatchRequest(req, res, store);
    const { statusCode, body } = await res.waitForResponse();
    expect(statusCode).toBe(200);
    const json = JSON.parse(body);
    expect(json.length).toBe(1);
    expect(json[0].text).toBe('Existing Note');
  });

  it('POST /api/notes rejects missing text with 400', async () => {
    const req = mockReq({ method: 'POST', url: '/api/notes', body: {} });
    const res = mockRes();
    await dispatchRequest(req, res, store);
    const { statusCode, body } = await res.waitForResponse();
    expect(statusCode).toBe(400);
    expect(JSON.parse(body).error).toMatch(/Field "text" is required/);
  });

  it('POST /api/notes rejects empty string text with 400', async () => {
    const req = mockReq({ method: 'POST', url: '/api/notes', body: { text: '   ' } });
    const res = mockRes();
    await dispatchRequest(req, res, store);
    const { statusCode, body } = await res.waitForResponse();
    expect(statusCode).toBe(400);
    expect(JSON.parse(body).error).toMatch(/Field "text" is required/);
  });

  it('POST /api/notes handles malformed JSON body with 400', async () => {
    const req = mockReq({ method: 'POST', url: '/api/notes', body: 'not-valid-json{' });
    const res = mockRes();
    await dispatchRequest(req, res, store);
    const { statusCode, body } = await res.waitForResponse();
    expect(statusCode).toBe(400);
    expect(JSON.parse(body).error).toMatch(/Invalid JSON body/);
  });

  it('returns 404 for unknown endpoints', async () => {
    const req = mockReq({ method: 'GET', url: '/api/nonexistent' });
    const res = mockRes();
    await dispatchRequest(req, res, store);
    const { statusCode, body } = await res.waitForResponse();
    expect(statusCode).toBe(404);
    expect(JSON.parse(body).error).toBe('Not Found');
  });
});
