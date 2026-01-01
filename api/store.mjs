/* global Buffer */
import net from 'node:net';

/**
 * Parse RESP buffer chunks.
 * Handles +, -, :, $, * types.
 */
function tryParseResp(buf) {
  if (buf.length === 0) return undefined;
  const prefix = String.fromCharCode(buf[0]);
  const newlineIdx = buf.indexOf('\r\n');
  if (newlineIdx === -1) return undefined;

  const firstLine = buf.subarray(1, newlineIdx).toString('utf8');

  if (prefix === '+') {
    return { value: firstLine, bytesRead: newlineIdx + 2 };
  }
  if (prefix === '-') {
    throw new Error(`Redis error: ${firstLine}`);
  }
  if (prefix === ':') {
    return { value: parseInt(firstLine, 10), bytesRead: newlineIdx + 2 };
  }
  if (prefix === '$') {
    const len = parseInt(firstLine, 10);
    if (len === -1) return { value: null, bytesRead: newlineIdx + 2 };
    const start = newlineIdx + 2;
    if (buf.length < start + len + 2) return undefined;
    const data = buf.subarray(start, start + len).toString('utf8');
    return { value: data, bytesRead: start + len + 2 };
  }
  if (prefix === '*') {
    const count = parseInt(firstLine, 10);
    if (count === -1) return { value: null, bytesRead: newlineIdx + 2 };
    let offset = newlineIdx + 2;
    const items = [];
    for (let i = 0; i < count; i++) {
      if (offset >= buf.length) return undefined;
      const subBuf = buf.subarray(offset);
      const subParsed = tryParseResp(subBuf);
      if (subParsed === undefined) return undefined;
      items.push(subParsed.value);
      offset += subParsed.bytesRead;
    }
    return { value: items, bytesRead: offset };
  }
  throw new Error(`Unknown RESP prefix: ${prefix}`);
}

/**
 * Execute raw RESP command over node:net TCP socket.
 */
function executeRedisCommand(host, port, args) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    let buffer = Buffer.alloc(0);

    socket.on('connect', () => {
      let cmd = `*${args.length}\r\n`;
      for (const arg of args) {
        const str = String(arg);
        cmd += `$${Buffer.byteLength(str)}\r\n${str}\r\n`;
      }
      socket.write(cmd);
    });

    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      try {
        const parsed = tryParseResp(buffer);
        if (parsed !== undefined) {
          socket.end();
          resolve(parsed.value);
        }
      } catch (err) {
        socket.destroy();
        reject(err);
      }
    });

    socket.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * RedisStore implements note persistence via raw RESP commands over net.
 */
export class RedisStore {
  constructor({ host = 'db', port = 6379 } = {}) {
    this.host = host;
    this.port = port;
  }

  async addNote(note) {
    const json = JSON.stringify(note);
    await executeRedisCommand(this.host, this.port, ['RPUSH', 'notes', json]);
    return note;
  }

  async getNotes() {
    const raw = await executeRedisCommand(this.host, this.port, ['LRANGE', 'notes', '0', '-1']);
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => {
      try {
        return JSON.parse(item);
      } catch {
        return { text: item };
      }
    });
  }

  async clearNotes() {
    await executeRedisCommand(this.host, this.port, ['DEL', 'notes']);
  }
}

/**
 * InMemoryStore implements the same interface for deterministic vitest tests.
 */
export class InMemoryStore {
  constructor(initialNotes = []) {
    this.notes = [...initialNotes];
  }

  async addNote(note) {
    this.notes.push(note);
    return note;
  }

  async getNotes() {
    return [...this.notes];
  }

  async clearNotes() {
    this.notes = [];
  }
}
