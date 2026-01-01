/* global console, process */
import { RedisStore } from './store.mjs';

const redisHost = process.env.REDIS_HOST || 'db';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const store = new RedisStore({ host: redisHost, port: redisPort });

async function seed() {
  console.log('Seeding notes database...');
  await store.clearNotes();

  const now = new Date().toISOString();
  await store.addNote({
    id: '1',
    text: 'Welcome to MergeLens notes demo',
    createdAt: now,
  });
  await store.addNote({
    id: '2',
    text: 'Redis storage over raw RESP without dependencies',
    createdAt: now,
  });
  await store.addNote({
    id: '3',
    text: 'Live preview verifies candidate vs main side by side',
    createdAt: now,
  });

  console.log('Successfully seeded 3 notes.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
