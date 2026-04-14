# TrailCheck Backend

This document covers the backend in `backend/trailcheck-api/`: architecture, modules, database model, endpoints, auth flow, external integrations, and the AI pipeline.

## Overview

TrailCheck's backend is a NestJS 11 API backed by Prisma and SQLite. It combines:

- seeded park and trail data
- user accounts and JWT auth
- user-generated trail reports
- per-user park preferences
- live NPS alerts
- live NWS forecasts
- hazard derivation
- AI-generated park digests

The backend is the system of record for app data, while also acting as an integration layer for external park-condition feeds.

## Stack

From [`backend/trailcheck-api/package.json`](../backend/trailcheck-api/package.json), the main backend stack is:

- NestJS 11
- TypeScript
- Prisma
- SQLite
- Passport JWT
- Argon2
- `@google/genai`
- a Python local-model bridge

## Bootstrap

[`src/main.ts`](../backend/trailcheck-api/src/main.ts) configures the app with:

- CORS enabled for `FRONTEND_ORIGIN`, default `http://localhost:3000`
- global `ValidationPipe`
- `whitelist: true`
- `transform: true`
- default port `3001`

This means DTO validation is enforced globally and the frontend is expected to run as a separate origin.

## Module layout

[`src/app.module.ts`](../backend/trailcheck-api/src/app.module.ts) imports:

- `TrailsModule`
- `ReportsModule`
- `HazardsModule`
- `ParksModule`
- `NpsModule`
- `WeatherModule`
- `AuthModule`
- `AiModule`

There is also a root route in [`src/app.controller.ts`](../backend/trailcheck-api/src/app.controller.ts) that still returns `"Hello World!"`, which looks like starter boilerplate rather than a product-facing health endpoint.

## Database model

The Prisma schema lives at [`prisma/schema.prisma`](../backend/trailcheck-api/prisma/schema.prisma).

### Main models

`Park`
- park metadata
- has many trails
- has many user preference rows

`Trail`
- belongs to a park
- stores slug, difficulty, status, length, description
- has many hazards and reports

`Hazard`
- trail-level hazard record
- stores type, severity, source, title, description, and active state

`TrailReport`
- user report attached to a trail
- stores rating, surface condition, note, reporter name, timestamp

`User`
- email, password hash, gender, age

`UserParkPreference`
- join table between user and park
- stores `isFavorite` and `wantsToGo`

`ParkSnapshot`
- raw park-context capture used by the AI flow
- stores raw NPS and NWS payloads
- can also store a Gemini reply

### Prisma service

The Prisma wrapper is [`src/prisma/prisma.service.ts`](../backend/trailcheck-api/src/prisma/prisma.service.ts). It extends `PrismaClient` and connects on module init.

## Seed data

Seed behavior is implemented in [`prisma/seed.ts`](../backend/trailcheck-api/prisma/seed.ts).

The seed script:

- validates that `parks.ts` and `park-trails.ts` stay in sync
- upserts all parks
- upserts all trails
- deletes stale trails and parks no longer present in the seed files

This means park and trail content is source-controlled and reproducible.

## Environment variables

Based on the root README and code usage, the backend expects:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="replace-with-a-secure-secret"
FRONTEND_ORIGIN="http://localhost:3000"
PORT=3001
NPS_API_KEY="your-nps-api-key"
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-2.5-flash"
LOCAL_MODEL_ENABLED=true
LOCAL_MODEL_PYTHON_BIN=python
LOCAL_MODEL_SCRIPT=ml/inference/generate_local.py
LOCAL_MODEL_CONFIG=ml/configs/trailcheck_qlora_4060.yaml
LOCAL_MODEL_ADAPTER_PATH=ml/models/trailcheck-qwen25-3b-json
LOCAL_MODEL_TIMEOUT_MS=90000
```

Notes:

- `JWT_SECRET` is required for protected endpoints.
- `NPS_API_KEY` enables live NPS alerts.
- `GEMINI_API_KEY` enables the Gemini fallback path.
- the local model is considered enabled unless `LOCAL_MODEL_ENABLED` is explicitly set to `false`.

## API routes

### Root

`GET /`
- returns `"Hello World!"`

### Auth

Implemented in [`src/auth/auth.controller.ts`](../backend/trailcheck-api/src/auth/auth.controller.ts).

`POST /auth/signup`
- creates a user
- hashes password with Argon2
- returns `{ access_token, user }`

`POST /auth/signin`
- verifies email and password
- returns `{ access_token, user }`

`GET /auth/me`
- JWT-protected
- returns `{ id, email }` from the JWT payload

### Parks

Implemented in [`src/parks/parks.controller.ts`](../backend/trailcheck-api/src/parks/parks.controller.ts).

`GET /parks`
- returns all parks ordered by name
- includes trails for each park

`GET /parks/preferences/me`
- JWT-protected
- returns the signed-in user's saved parks

`GET /parks/:slug/preferences`
- JWT-protected
- returns favorite and want-to-go flags for one park

`PUT /parks/:slug/preferences`
- JWT-protected
- upserts or clears a user's preference row for a park

### Trails

Implemented in [`src/trails/trails.controller.ts`](../backend/trailcheck-api/src/trails/trails.controller.ts).

`GET /trails`
- returns all trails with their park

`GET /trails/:id`
- returns one trail
- includes park, stored hazards, latest reports, live NPS alerts, and live weather

### Reports

Implemented in [`src/reports/reports.controller.ts`](../backend/trailcheck-api/src/reports/reports.controller.ts).

`POST /reports`
- JWT-protected
- creates a trail report
- stamps `reporterName` from the signed-in user's email

### AI

Implemented in [`src/ai/ai.controller.ts`](../backend/trailcheck-api/src/ai/ai.controller.ts).

`POST /ai/ask`
- answers a park-specific question

`GET /ai/parks/:parkSlug/digest`
- returns a park digest with summary, notification, hazards, alerts, weather, and generation metadata

### Hazards

There is a `HazardsController`, but it currently exposes no public routes. Hazards are derived internally and used mostly by the AI and park-condition layers.

## DTO validation

DTOs are validated globally through Nest's validation pipe.

### Auth DTOs

[`src/auth/dto/auth.dto.ts`](../backend/trailcheck-api/src/auth/dto/auth.dto.ts)
- email must be valid
- email provider must be one of the allowed domains
- password min length is 8

[`src/auth/dto/signup.dto.ts`](../backend/trailcheck-api/src/auth/dto/signup.dto.ts)
- extends auth DTO
- `gender` must be a valid enum value
- `age` must be an integer from 1 to 120

### Report DTO

[`src/reports/dto/create_report.dto.ts`](../backend/trailcheck-api/src/reports/dto/create_report.dto.ts)
- validates `trailId`, `conditionRating`, `surfaceCondition`, and optional text fields

### Park preference DTO

[`src/parks/dto/update-park-preference.dto.ts`](../backend/trailcheck-api/src/parks/dto/update-park-preference.dto.ts)
- validates `isFavorite` and `wantsToGo` as booleans

### AI ask DTO

[`src/ai/dto/ask.dto.ts`](../backend/trailcheck-api/src/ai/dto/ask.dto.ts)
- requires non-empty `parkSlug`
- requires non-empty `question`
- caps question length at 500 chars

## Auth flow

Authentication is handled by:

- [`src/auth/auth.service.ts`](../backend/trailcheck-api/src/auth/auth.service.ts)
- [`src/auth/jwt.strategy.ts`](../backend/trailcheck-api/src/auth/jwt.strategy.ts)

### Behavior

Signup:

- hashes the password with Argon2
- catches duplicate email conflicts
- returns a JWT with the user object

Signin:

- loads the user by email
- verifies the password with Argon2
- returns a JWT with the user object

JWTs:

- use payload `{ sub, email }`
- use `JWT_SECRET`
- expire in `1d`

Protected routes receive a normalized `JwtUser`:

```ts
type JwtUser = {
  id: number;
  email: string;
};
```

## Parks module

[`src/parks/parks.service.ts`](../backend/trailcheck-api/src/parks/parks.service.ts) handles:

- listing parks and trails
- reading user park preferences
- updating favorites and want-to-go flags

One notable implementation detail: it has an `ensurePreferenceTableExists()` method that creates the preference table and indexes with raw SQL if needed. That is a pragmatic safeguard on top of migrations.

Preference behavior is also intentionally clean:

- if both flags are false, the preference row is deleted instead of stored empty

## Trails module

[`src/trails/trails.service.ts`](../backend/trailcheck-api/src/trails/trails.service.ts) is responsible for trail listings and detail pages.

`findOne(id)`:

- loads the trail from Prisma
- includes park, hazards, and up to 5 recent reports
- fetches NPS alerts and weather in parallel with `Promise.allSettled`
- degrades gracefully if one upstream fails

One detail worth watching: the returned live-alert property is `NpsAlerts` with a capital `N`, while the frontend types expect `npsAlerts`.

## Reports module

[`src/reports/reports.service.ts`](../backend/trailcheck-api/src/reports/reports.service.ts) is intentionally small.

It simply creates a `TrailReport` with:

- trail ID
- rating
- surface condition
- note
- reporter name from the signed-in user's email

There is no moderation or approval layer in the current code.

## NPS integration

[`src/nps/nps.service.ts`](../backend/trailcheck-api/src/nps/nps.service.ts) fetches live alert data.

Flow:

1. resolve a park code from the park registry
2. read `NPS_API_KEY`
3. call `https://developer.nps.gov/api/v1/alerts`
4. map the remote payload to local `NpsAlert` objects

Failure behavior:

- missing park code returns empty alerts
- fetch failures return empty alerts
- non-OK upstream responses return empty alerts

The service logs errors but usually avoids hard failures in downstream features.

## Weather integration

[`src/weather/weather.service.ts`](../backend/trailcheck-api/src/weather/weather.service.ts) fetches NWS forecasts.

Flow:

1. resolve park coordinates from the internal park registry
2. call `api.weather.gov/points/{lat},{lng}`
3. extract the forecast URL
4. fetch the forecast feed
5. map the first 6 periods into the app's `ParkWeather` shape

Returned weather periods include:

- name
- temperature
- temperature unit
- wind speed
- short forecast
- detailed forecast
- icon

Like the NPS service, this one degrades to `null` on failure.

## Hazard engine

The hazard engine is implemented internally through:

- [`src/hazards/hazards.service.ts`](../backend/trailcheck-api/src/hazards/hazards.service.ts)
- [`src/hazards/hazard-profiles.ts`](../backend/trailcheck-api/src/hazards/hazard-profiles.ts)
- [`src/hazards/hazard.types.ts`](../backend/trailcheck-api/src/hazards/hazard.types.ts)

It combines:

- season-aware park profiles
- weather-text interpretation
- alert keyword matching
- weighted hazard scoring

This service is a major part of the backend's reasoning layer even though it is not exposed directly as a public route.

## AI flow

The AI orchestration layer lives in [`src/ai/ai.service.ts`](../backend/trailcheck-api/src/ai/ai.service.ts).

### Responsibilities

- collect park context from Prisma, NPS, weather, and hazards
- persist raw NPS/NWS snapshots when possible
- try local structured generation first
- fall back to Gemini
- fall back again to rules-based text

### Local model path

[`src/ai/local-model.service.ts`](../backend/trailcheck-api/src/ai/local-model.service.ts) bridges NestJS to the Python local model runner. It:

- writes temp input JSON
- calls the Python script
- parses stdout
- checks for adapter readiness
- recommends fallback when generation fails

### Fallback order

The backend generation order is:

1. local model
2. Gemini
3. rules-based fallback

This is why the AI endpoints remain usable even when the local adapter is missing or Gemini is unavailable.

## Request flow by feature

Home page:
- frontend calls `GET /parks`
- backend returns seeded parks and trails

Park page:
- frontend calls `GET /parks` and `GET /ai/parks/:slug/digest`
- backend combines local DB content with live conditions and AI summary logic

Trail page:
- frontend calls `GET /trails/:id`
- backend returns trail details plus live NPS and NWS context

Reporting:
- frontend calls `POST /reports` with Bearer token
- backend validates and stores a `TrailReport`

Saved parks:
- frontend calls the `/parks/.../preferences` endpoints
- backend reads or updates `UserParkPreference`

## Common commands

Useful commands from `package.json`:

```bash
npm run start:dev
npm run build
npm run start:prod
npm run test
npm run test:e2e
npm run lint
```

Typical local setup:

```bash
cd backend/trailcheck-api
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

## Important files

- [`backend/trailcheck-api/src/main.ts`](../backend/trailcheck-api/src/main.ts)
- [`backend/trailcheck-api/src/app.module.ts`](../backend/trailcheck-api/src/app.module.ts)
- [`backend/trailcheck-api/prisma/schema.prisma`](../backend/trailcheck-api/prisma/schema.prisma)
- [`backend/trailcheck-api/prisma/seed.ts`](../backend/trailcheck-api/prisma/seed.ts)
- [`backend/trailcheck-api/src/auth/auth.service.ts`](../backend/trailcheck-api/src/auth/auth.service.ts)
- [`backend/trailcheck-api/src/parks/parks.service.ts`](../backend/trailcheck-api/src/parks/parks.service.ts)
- [`backend/trailcheck-api/src/trails/trails.service.ts`](../backend/trailcheck-api/src/trails/trails.service.ts)
- [`backend/trailcheck-api/src/reports/reports.service.ts`](../backend/trailcheck-api/src/reports/reports.service.ts)
- [`backend/trailcheck-api/src/nps/nps.service.ts`](../backend/trailcheck-api/src/nps/nps.service.ts)
- [`backend/trailcheck-api/src/weather/weather.service.ts`](../backend/trailcheck-api/src/weather/weather.service.ts)
- [`backend/trailcheck-api/src/hazards/hazards.service.ts`](../backend/trailcheck-api/src/hazards/hazards.service.ts)
- [`backend/trailcheck-api/src/ai/ai.service.ts`](../backend/trailcheck-api/src/ai/ai.service.ts)

## Bottom line

The backend is the operational core of TrailCheck. It owns the park and trail catalog, secures write actions with JWT auth, enriches trail pages with live alerts and weather, and powers park-level summaries through a layered hazard-and-AI pipeline.
