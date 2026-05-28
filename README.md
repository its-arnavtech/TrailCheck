# TrailCheck

TrailCheck is a full-stack web app for exploring U.S. national park trails, checking current conditions, and reporting on-the-ground hazards. It combines a Next.js frontend, a NestJS API, a Prisma-backed database, and live park context from the National Park Service, weather data, and Gemini-powered condition summaries.

![TrailCheck system design](./sys_design_w_RAG.png)

## What It Does

- Browse national parks and their trails from a single interface.
- View trail details, recent reports, hazard information, weather, and NPS alerts.
- Create an account, sign in, and submit trail condition reports.
- Generate park condition digests with retrieval-augmented AI responses grounded in live park context.

## Tech Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- Backend: NestJS 11, TypeScript
- Database: Prisma ORM with PostgreSQL for local and production environments
- Auth: JWT + Passport
- External data: National Park Service alerts, weather forecast data
- AI: Google Gemini via `@google/genai`

## Repository Structure

```text
.
|-- frontend/trailcheck-web   # Next.js application
|-- backend/trailcheck-api    # NestJS API + Prisma schema/seed
`-- sys_design_w_RAG.png      # architecture diagram used above
```

## Core Features

### Frontend

- Landing page with a park explorer and featured national park visuals
- Park and trail detail pages
- Local auth session handling in the browser
- Report submission flow for signed-in users

### Backend

- `GET /parks` to list parks with attached trails
- `GET /trails` and `GET /trails/:id` for trail discovery and details
- `POST /auth/signup`, `POST /auth/signin`, and `GET /auth/me` for authentication
- `POST /reports` for authenticated trail report submission
- `POST /ai/ask` and `GET /ai/parks/:parkSlug/digest` for AI-assisted park condition summaries

## Local Setup

### 1. Install dependencies

```bash
cd backend/trailcheck-api
npm install

cd ../../frontend/trailcheck-web
npm install
```

### 2. Configure environment variables

Create local environment files manually. These files are intentionally ignored and should not be committed:

- Backend: `backend/trailcheck-api/.env`
- Frontend: `frontend/trailcheck-web/.env.local`

Notes:

- The backend needs values for database connectivity, JWT signing, frontend origin/CORS, and optional NPS, Gemini, and email-provider integrations.
- The frontend needs the public API base URL for the backend.
- `JWT_SECRET` is required for sign-up, sign-in, and authenticated report submission.
- `NPS_API_KEY` enables live National Park Service alerts.
- `GEMINI_API_KEY` enables Gemini-generated summaries. Without it, the backend falls back to a non-AI summary path.
- The password reset email provider is disabled unless configured with provider credentials in a private environment file or deployment secret store.

### 3. Run database migrations and seed data

```bash
cd backend/trailcheck-api
npm run db:start
npx prisma migrate deploy
npx prisma db seed
```

If Docker Desktop is not already running, start it first so the local PostgreSQL container can bind to `localhost:5432`.

For the backend package scripts, the equivalent commands are:

```bash
cd backend/trailcheck-api
npm run db:start
npm run db:setup
```

You can inspect or stop the local database with:

```bash
cd backend/trailcheck-api
npm run db:logs
npm run db:stop
```

If you prefer the raw Prisma commands, they still work:

```bash
cd backend/trailcheck-api
npx prisma migrate deploy
npx prisma db seed
```

### 4. Start the backend

```bash
cd backend/trailcheck-api
npm run start:dev
```

The API runs on `http://localhost:3001` by default.

### 5. Start the frontend

```bash
cd frontend/trailcheck-web
npm run dev
```

The web app runs on `http://localhost:3000`.

## Available Scripts

### Frontend

```bash
cd frontend/trailcheck-web
npm run dev
npm run build
npm run start
npm run lint
```

### Backend

```bash
cd backend/trailcheck-api
npm run start:dev
npm run build
npm run start:prod
npm run test
npm run test:e2e
npm run lint
```

## Data Model Overview

The Prisma schema currently centers on:

- `Park`
- `Trail`
- `Hazard`
- `TrailReport`
- `User`

This supports seeded park and trail data, user-submitted reports, and derived or external hazard context.

## Current Notes

- The repo contains starter/template READMEs inside the frontend and backend folders; the top-level `README.md` is the one GitHub displays on the repository main page.
- The backend now targets PostgreSQL consistently, including local development and Render production deployments.

## Deployment Shape

- Deploy `frontend/trailcheck-web` to Vercel.
- Deploy `backend/trailcheck-api` as its own always-on service using a private container or platform build config.
- Keep deployment manifests and production secret values in the hosting provider secret store, not in the public repo.
- Set the frontend deployment to point at the backend API URL.
- Set the backend deployment to allow the frontend origin and use a managed production database.
- Password reset email is disabled by default. Enable it only after adding valid provider settings to the backend deployment secret store.

## Production Security Defaults

- The backend validates required env vars on boot and refuses production startup with a weak JWT secret.
- Production startup refuses non-PostgreSQL `DATABASE_URL` values, which helps prevent mismatched or ephemeral database deployments.
- Password reset email provider credentials are validated only when email delivery is explicitly enabled.
- CORS is restricted to the configured frontend allowlist, Helmet headers are enabled, and request throttling is turned on globally.
- `GET /health` is available for platform health checks and uptime probes.

## Future Improvements

- Add screenshots or a short product demo GIF
- Document deployment steps for frontend and backend
- Add an API reference section with example request/response payloads
- Replace placeholder contact/footer content in the app with project ownership details
