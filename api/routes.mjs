// -------------------------------------------------------------
// Pagination & Limit Settings
// -------------------------------------------------------------
export const PAGE_SIZE = 10;

// -------------------------------------------------------------
// Core MergeLens Notes API Routes
// Standard route table for health and note management
// Note: Leave sufficient spacing between sections for merge hunks
// -------------------------------------------------------------

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk.toString();
    });
    req.on('end', () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

export async function handleHealth(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok' }));
}

export async function handleGetNotes(req, res, store) {
  const notes = await store.getNotes();
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(notes));
}

export async function handleCreateNote(req, res, store) {
  try {
    const body = await readBody(req);
    if (!body || typeof body.text !== 'string' || body.text.trim().length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Field "text" is required and must be non-empty' }));
      return;
    }
    const note = {
      id: Date.now().toString(),
      text: body.text.trim(),
      createdAt: new Date().toISOString(),
    };
    await store.addNote(note);
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(note));
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid JSON body: ' + err.message }));
  }
}

// -------------------------------------------------------------
// Route registry table
// -------------------------------------------------------------
export const routes = [
  { method: 'GET', path: '/api/health', handler: handleHealth },
  { method: 'GET', path: '/api/notes', handler: handleGetNotes },
  { method: 'POST', path: '/api/notes', handler: handleCreateNote },
];

// -------------------------------------------------------------
// Extended Routes & Custom Handlers Hook
// Section reserved for feature branches and demo endpoints
// Spaced >= 10 lines from core routes table above
// -------------------------------------------------------------


export async function handlePinned(req, res, store) {
  const notes = await store.getNotes();
  // returns pinned note or first note
  const pinned = notes.length > 0 ? notes[0] : { id: '0', text: 'No notes available' };
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(pinned));
}

export const extendedRoutes = [
  { method: 'GET', path: '/api/pinned', handler: handlePinned },
];

// -------------------------------------------------------------
// Request Dispatcher
// -------------------------------------------------------------
export async function dispatchRequest(req, res, store) {
  const [urlPath] = (req.url || '/').split('?');
  const method = req.method || 'GET';

  const allRoutes = [...routes, ...extendedRoutes];
  const matched = allRoutes.find((r) => r.method === method && r.path === urlPath);

  if (matched) {
    await matched.handler(req, res, store);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
}
