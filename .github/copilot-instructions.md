**Overview**
- **Purpose:** This repo is a simple Node/Express static site + booking backend using SQLite and Gmail SMTP for notifications.
- **Backend entry:** [server.js](server.js) — lightweight API + email logic, uses `better-sqlite3` and `nodemailer`.

**Run / Dev**
- **Install:** npm install
- **Init DB:** npm run init-db (creates `database.sqlite`; see [scripts/init_db.js](scripts/init_db.js))
- **Start server:** npm start (alias `dev` also runs `node server.js`) — see [package.json](package.json) scripts.

**Database & scripts**
- **SQLite file:** `database.sqlite` in repo root. The server opens it via `process.cwd()` in [server.js](server.js).
- **Helpful scripts:**
  - **init-db:** [scripts/init_db.js](scripts/init_db.js)
  - **check-db:** [scripts/check_schema.js](scripts/check_schema.js)
  - **view-db:** [scripts/generate_db_view.js](scripts/generate_db_view.js)

**API patterns & important routes**
- Routes live in [server.js](server.js) (no router layering). Key endpoints:
  - **GET /api/services** — returns top services (transforms `Signature Balayage` → `Balayage`).
  - **POST /api/book** — inserts appointment into `appointments`, then attempts to email salon owner.
  - **GET /api/admin/confirm-appointment?id=** — sets status = 'confirmed' and emails client.
- Behavior to note: DB writes occur synchronously via `better-sqlite3` prepared statements; email failures are logged but do not roll back DB writes.

**Env & secrets**
- Uses `.env` for `EMAIL_USER` and `EMAIL_PASS` (see [server.js](server.js)). When running locally set these or tests will not send mail.
- PORT defaults to 3000.

**Frontend & static files**
- Static site in `public/`. Server serves `public` and specific subfolders (`/css`, `/js`, `/assets`) explicitly — check [server.js](server.js).
- Client-side booking flow lives in `public/js/booking.js` and `public/js/script.js` (look for API calls to `/api/book` and `/api/services`).

**Conventions & patterns for changes**
- Single-file backend: add small endpoints to [server.js] rather than creating new services unless adding significant features.
- Database migrations: there is no migration framework; `scripts/init_db.js` creates initial schema — modify that for structural DB changes.
- Error handling: endpoints commonly log errors and return simple JSON or HTML — follow existing patterns (don’t introduce complex middleware without reason).

**When editing or adding features**
- If you add env keys, update README.md and ensure `server.js` uses `process.env` consistently.
- For new APIs, follow the existing pattern: prepare a statement, run/`get`/`all`, catch and log errors, return simple JSON.

**Where to look first**
- [server.js](server.js) — core runtime behavior, DB access, email flow.
- [package.json](package.json) — available scripts.
- [scripts/init_db.js](scripts/init_db.js) and [scripts/check_schema.js](scripts/check_schema.js) — DB initialization and sanity checks.
- `public/js/booking.js` — client API usage examples.

If anything here is unclear or you want more examples (tests, CI, or expanded API docs), tell me which area to expand and I'll iterate.
