# TrailCheck

TrailCheck is a full-stack web app for exploring U.S. national park trails, checking current conditions, and reporting on-the-ground hazards. It combines a Next.js frontend, a NestJS API, Prisma with PostgreSQL, live National Park Service alerts, National Weather Service forecasts, and a three-step text generator.

![TrailCheck system design](./sys_design_w_RAG.png)

## What It Does

- Browse national parks and their trails from a single interface.
- View trail details, recent reports, hazard information, weather, and NPS alerts.
- Create an account, sign in, and submit trail condition reports.
- Generate a park condition digest. The API fills the prompt with live NPS alerts, NWS forecast periods, and the in-process hazard rules. There is no vector index.

## Tech Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- Backend: NestJS 11, TypeScript
- Database: Prisma ORM with PostgreSQL for local and production environments
- Auth: JWT + Passport
- External data: National Park Service alerts, National Weather Service forecasts (`api.weather.gov`)
- AI chain: optional local QLoRA model, then Gemini, then a rules summary. See [Which AI path runs](#which-ai-path-runs).

## Repository Structure

```text
.
|-- frontend/trailcheck-web          # Next.js application
|-- backend/trailcheck-api           # NestJS API, Prisma schema, and ml/
|-- backend/trailcheck-api/ml        # rule-generated dataset, QLoRA config, eval
|-- docs                             # backend, frontend, and model notes
|-- compose.yaml                     # local PostgreSQL only
`-- sys_design_w_RAG.png             # architecture sketch; the runtime is not a vector RAG index
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

Copy the examples and fill in local values. Commit the examples. Do not commit the copies:

```bash
cp backend/trailcheck-api/.env.example backend/trailcheck-api/.env
cp frontend/trailcheck-web/.env.example frontend/trailcheck-web/.env.local
```

Notes:

- The backend needs database connectivity, a JWT signing secret of at least 32 characters, and the frontend origin for CORS.
- The frontend needs `NEXT_PUBLIC_API_BASE_URL`.
- `NPS_API_KEY` enables live National Park Service alerts. Without it, alert lists are empty.
- `GEMINI_API_KEY` enables the Gemini step. Without it, the API uses the rules summary after the local model step fails or is disabled.
- Leave `LOCAL_MODEL_ENABLED=false` unless you are running the Python model server and have a real adapter. The default in code is enabled, which only helps when that server is up.
- Password reset email stays disabled until `PASSWORD_RESET_EMAIL_PROVIDER=resend` and the provider settings are present. Put those in the private env file, not in git.

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

## Which AI path runs

`POST /ai/ask` and `GET /ai/parks/:parkSlug/digest` share one chain. The JSON field `generationSource` says which step wrote the text.

| Order | Source value | When it runs |
| --- | --- | --- |
| 1 | `local` | `LOCAL_MODEL_ENABLED` is not `false`, and the local server or Python subprocess returns schema-valid JSON. The default transport calls `http://127.0.0.1:8001`. That process must be started separately and needs a saved QLoRA adapter. |
| 2 | `gemini` | The local step is skipped, missing, or invalid, and `GEMINI_API_KEY` is set to a real key. |
| 3 | `fallback` | The local step did not produce valid JSON and Gemini is unset or errors. The text comes from the hazard rules, NPS alerts, and the NWS forecast. |

The hosted API on Render has no GPU. This repository does not contain an adapter checkpoint. A normal hosted request therefore does not run Qwen. It uses Gemini if the host has a key, otherwise the rules summary. The live `generationSource` value is the check. This repo cannot see the Render env, and these docs do not guess it.

The training examples are rule-generated, not hand-written. See [Model training](#model-training).

## Model training

Code lives in `backend/trailcheck-api/ml/`.

- Labels are produced by `ml/data/build_dataset.py` from weather thresholds and NPS alert keywords.
- The full 2024 build recorded in commit `ae20b74` had 660 examples from Big Bend and Yosemite (560 train / 100 validation). Those JSONL files are not in git. 660 is a split count, not a model score.
- `ml/configs/trailcheck_qlora_4060.yaml` is a 4-bit QLoRA config for `Qwen/Qwen2.5-3B-Instruct` aimed at one RTX 4060-class GPU.
- No adapter is committed. A training run was reported finished on that GPU, but the artifacts were lost. `ml/results/model_eval.json` says `not yet run`.
- `ml/results/harness_smoke.json`, when present, scores a replay of the rule labels on the tiny fixture. It does not score Qwen.

CPU smoke test, from `backend/trailcheck-api` after `pip install -r ml/requirements-smoke.txt`:

```bash
python -m unittest discover -s ml/tests -v
```

That builds the fixture dataset, checks JSON-valid rate and risk accuracy for the rules replay, and refuses to invent model metrics.

GPU training, after installing a CUDA PyTorch wheel and `ml/requirements.txt`, and after rebuilding the processed CSVs the 4060 config points at:

```bash
python ml/data/build_dataset.py --config ml/configs/trailcheck_qlora_4060.yaml
python ml/training/train_sft.py --config ml/configs/trailcheck_qlora_4060.yaml
python ml/inference/generate_local.py \
  --config ml/configs/trailcheck_qlora_4060.yaml \
  --adapter-path ml/models/trailcheck-qwen25-3b-json \
  --dataset-file ml/data/outputs/validation.jsonl \
  --output-file ml/data/outputs/local_predictions.jsonl
python ml/evaluation/evaluate_outputs.py \
  --gold ml/data/outputs/validation.jsonl \
  --predictions local=ml/data/outputs/local_predictions.jsonl \
  --output ml/results/model_eval.json
```

Replace the placeholder `model_eval.json` with that report only after the command prints real metrics. The processed 2024 CSVs are gitignored and are not in a fresh clone, so the 660-row build has to be reconstructed from the scripts in `backend/trailcheck-api/scripts/` before the GPU command above can see them.

## Current Notes

- The top-level `README.md` is the one GitHub shows. Nested READMEs are narrower.
- Local and hosted databases are PostgreSQL. `compose.yaml` starts the local database.
- Do not describe the SFT set as hand-built, and do not quote model accuracy until `model_eval.json` is replaced with a real run.

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
