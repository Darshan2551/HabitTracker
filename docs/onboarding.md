# Onboarding Guide

## 1) Prerequisites

- Node.js 20+ (Node.js 22 recommended)
- Docker Desktop (for PostgreSQL, Redis, MailHog)

## 2) Start Dependencies

```bash
docker compose up -d postgres redis mailhog
```

## 3) Configure Environment

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Update secrets for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.

## 4) Install and Migrate

```bash
npm install
npm --workspace apps/api run prisma:generate
npm --workspace apps/api run prisma:migrate
npm --workspace apps/api run prisma:seed
```

## 5) Run the App

Terminal 1:
```bash
npm run dev:api
```

Terminal 2:
```bash
npm run dev:web
```

## 6) Useful Local URLs

- Web app: `http://localhost:5173`
- API: `http://localhost:4000`
- Swagger docs: `http://localhost:4000/docs`
- MailHog UI: `http://localhost:8025`

## 7) Test Commands

```bash
npm run test:api
npm run test:web
npm --workspace apps/web run test:e2e
```

Run API integration tests explicitly:

```bash
RUN_INTEGRATION_TESTS=true npm run test:api
```
