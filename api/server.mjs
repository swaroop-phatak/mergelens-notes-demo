/* global console, process */
import http from 'node:http';
import { RedisStore } from './store.mjs';
import { dispatchRequest } from './routes.mjs';

const redisHost = process.env.REDIS_HOST || 'db';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const store = new RedisStore({ host: redisHost, port: redisPort });

const server = http.createServer(async (req, res) => {
  try {
    await dispatchRequest(req, res, store);
  } catch (err) {
    console.error('Unhandled request error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
  }
});

const PORT = parseInt(process.env.PORT || '3000', 10);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`notes-api listening on port ${PORT}`);
});
