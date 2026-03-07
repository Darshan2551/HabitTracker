# Habit Tracker (Production-Ready Monorepo)

Modern full-stack Habit Tracker with:

- Secure auth (email/password + Google OAuth, JWT access + rotating refresh tokens)
- Habit scheduling (daily/weekly/monthly/custom), completions, streaks, goals, reminders
- Analytics (heatmap, trends, streak charts), CSV export + JSON import
- Offline-first sync with conflict handling (last-write-wins + conflict flags)
- Installable PWA frontend
- PostgreSQL + Prisma + Redis (queue, sessions, rate limiting)
- Admin dashboard + broadcast messages
- Dockerized local stack + Kubernetes sample manifests + GitHub Actions CI

## Tech Stack

- Backend: Node.js, Fastify, TypeScript, Prisma, PostgreSQL, Redis, BullMQ
- Frontend: React (Vite), TypeScript, Tailwind CSS, React Query, Zustand
- Auth/Security: JWT, refresh rotation, bcrypt, CSRF checks, rate limiting
- Notifications: SMTP email, Web Push (VAPID), SMS pluggable stub
- Testing: Vitest (unit/integration), Playwright (critical E2E flow)

## Monorepo Layout

```text
apps/
  api/     # Fastify API + Prisma + tests
  web/     # React PWA frontend + tests
docs/      # OpenAPI, onboarding guide, Postman collection
infra/     # Dockerfiles and helper scripts
k8s/       # Kubernetes sample manifests
```

## Core Feature Coverage

- Auth: register, verify email, login, refresh, Google sign-in, reset password, logout, delete account
- Habit management: CRUD, soft delete + restore window, tags, reminders, snooze, skip
- Scheduling: daily, weekly, monthly, custom rules
- Completion tracking: notes, backfill, audit logs, conflict flags
- Streaks/goals: current streak, best streak, completion rate
- Views: dashboard, calendar, analytics, settings, notifications, admin
- Themes: light/dark/system, palettes, custom accent, font scaling, accessibility toggles
- Export/import: CSV history export and JSON restore
- Social (optional): shareable snapshots + leaderboard endpoint
- Offline mode: queued operations in IndexedDB + sync endpoint

## Security Defaults

- Password policy enforcement (length + complexity)
- Bcrypt hashing (cost 12)
- JWT access + rotating refresh token persistence
- CSRF token checks for sensitive flows
- Redis-backed auth attempt throttling and rate limiting
- Role-based admin route checks
- Audit log entries for sensitive mutations

## Local Setup

1. Copy env files:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

2. Install dependencies:

```bash
npm install
```

3. Start Postgres/Redis/MailHog:

```bash
docker compose up -d postgres redis mailhog
```

4. Run Prisma migrations + seed:

```bash
npm --workspace apps/api run prisma:generate
npm --workspace apps/api run prisma:migrate
npm --workspace apps/api run prisma:seed
```

5. Run API and web:

```bash
npm run dev:api
npm run dev:web
```

## Scripts

- `npm run build` - Build backend and frontend
- `npm run test` - Run backend + frontend tests
- `npm run lint` - Run lint checks in both apps
- `npm run compose:up` - Start full Docker stack
- `npm run compose:down` - Stop stack and clear volumes

## API Docs

- Swagger UI: `http://localhost:4000/docs`
- OpenAPI file: `docs/openapi.yaml`
- Postman: `docs/postman/HabitTracker.postman_collection.json`

## Testing

### Backend

- Unit: scheduling logic tests
- Integration: auth + habit lifecycle API tests

```bash
npm run test:api
```

To run integration API tests (requires PostgreSQL + Redis):

```bash
RUN_INTEGRATION_TESTS=true npm run test:api
```

Windows PowerShell:

```powershell
$env:RUN_INTEGRATION_TESTS='true'; npm run test:api
```

Coverage:

```bash
npm --workspace apps/api run test:coverage
```

### Frontend

```bash
npm run test:web
npm --workspace apps/web run test:e2e
```

## Docker

Run everything:

```bash
docker compose up --build
```

Services:

- Web: `http://localhost:5173`
- API: `http://localhost:4000`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- MailHog: `http://localhost:8025`

## Kubernetes (Sample)

Apply manifests:

```bash
sh infra/scripts/deploy-k8s.sh
```

Update image references in:

- `k8s/api.yaml`
- `k8s/web.yaml`

## CI/CD

GitHub Actions workflow:

- `.github/workflows/ci.yml`

Pipeline stages:

1. Install dependencies
2. Generate Prisma client and run migrations
3. Run backend + frontend tests
4. Build API + web
5. Upload coverage artifact

## Accessibility & UX Notes

- Keyboard-friendly controls and semantic form labels
- Adjustable font scale and high-contrast toggle
- Reduce-motion mode support
- Responsive mobile-first layout

## Demo Media

Place screenshots/video in `docs/screenshots/`:

- `landing.png`
- `dashboard.png`
- `calendar.png`
- `analytics.png`
- `settings.png`
- `demo.mp4`

## Additional Docs

- `docs/onboarding.md` - quick onboarding runbook
- `docs/test-coverage.md` - coverage generation notes
