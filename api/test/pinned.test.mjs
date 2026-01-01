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

describe('Pinned API Handler', () => {
  let store;
  beforeEach(() => {
    store = new InMemoryStore();
  });

  it('GET /api/pinned returns note with text field', async () => {
    const postReq = mockReq({
      method: 'POST',
      url: '/api/notes',
      body: { text: 'Featured note' },
    });
    const postRes = mockRes();
    await dispatchRequest(postReq, postRes, store);
    const postResult = await postRes.waitForResponse();
    expect(postResult.statusCode).toBe(201);

    const getReq = mockReq({ method: 'GET', url: '/api/pinned' });
    const getRes = mockRes();
    await dispatchRequest(getReq, getRes, store);
    const { statusCode, body } = await getRes.waitForResponse();
    expect(statusCode).toBe(200);
    const json = JSON.parse(body);
    expect(json.text).toBe('Featured note');
  });
});
