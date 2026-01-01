# MergeLens Notes App Demo ("v1")

A self-contained reference application designed for testing and demonstrating MergeLens merge conflict resolution, sandbox test execution, and multi-variant live preview.

## Architecture

This application maps directly to the MergeLens **static SPA + Node API + Redis** compose preview archetype:

- **Frontend (`web/`)**: Plain static HTML5 + vanilla JavaScript + CSS. No build step required (`staticDir: web`). Served directly via the MergeLens gateway.
- **Backend API (`api/`)**: Pure Node.js HTTP service with zero external npm dependencies. Interacts with Redis over raw RESP protocol commands via `node:net` TCP sockets.
- **Data Store (`db`)**: Redis key-value store running allowlisted digest-pinned image in compose preview.
- **Preview Configuration (`mergelens.yml`)**: Multi-service compose topology linking static gateway, Node API, and Redis database with automated seed command and `/api/health` check.

> **Note on Databases:** MongoDB and other databases requiring custom storage engines or external daemon dependencies are currently unsupported in MergeLens previews. Redis is the primary allowlisted key-value store.

## Repository Scenarios

The accompanying generator `make-demo-repo.mjs` initializes a git repository (`notes-demo`) with base `v1` and 4 scenario branches against `main`:

| Scenario | Branch | Description | Resolution / Outcome |
|---|---|---|---|
| **A** | `feature-api` | Main renames `text` &rarr; `body`. Feature adds `GET /api/pinned` and a test expecting `text`. | Textually clean merge; candidate fails test (`integration-regression`). |
| **B** | `feature-ui` | Main renames `text` &rarr; `body`. Feature adds pinned-notes UI widget expecting `text`. | Clean merge; API tests pass; candidate preview page displays `undefined`. |
| **C** | `feature-imports`| Main and feature add adjacent routes in `api/routes.mjs`. | Text conflict; AI resolves cleanly by retaining both routes. |
| **D** | `feature-limit` | Main sets `PAGE_SIZE = 20`; feature sets `PAGE_SIZE = 50`. | Semantic conflict; AI abstains requiring human decision. |

## Running Tests Locally

```bash
# Direct in-memory vitest execution (no Redis / Docker required)
npx vitest run --root examples/notes-app
```

