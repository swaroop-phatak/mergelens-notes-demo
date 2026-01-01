/* global process */
import { describe, it, expect, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { InMemoryStore } from '../store.mjs';
import { dispatchRequest } from '../routes.mjs';

function mockReq({ method = 'GET', url = '/' } = {}) {
  const req = new EventEmitter();
  req.method = method;
  req.url = url;
  req.headers = { 'content-type': 'application/json' };
  process.nextTick(() => req.emit('end'));
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

describe('Info API Handler', () => {
  let store;
  beforeEach(() => {
    store = new InMemoryStore();
  });

  it('GET /api/info returns 200 with total count and healthy status', async () => {
    const req = mockReq({ method: 'GET', url: '/api/info' });
    const res = mockRes();
    await dispatchRequest(req, res, store);
    const { statusCode, body } = await res.waitForResponse();
    expect(statusCode).toBe(200);
    const json = JSON.parse(body);
    expect(json.status).toBe('healthy');
    expect(json.totalNotes).toBe(0);
  });
});
