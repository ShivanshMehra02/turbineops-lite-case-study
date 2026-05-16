# INSTALL

## Prereqs
- Docker & Docker Compose
- Node 20+ and npm
- (Optional) `make`

## Full stack with Docker Compose (recommended for evaluators)
From the repo root:

```bash
docker compose up --build
```

- **Frontend**: http://localhost:3000 (static build; API base URL `http://localhost:4000` is baked in at image build via `VITE_API_BASE`)
- **REST / Swagger**: http://localhost:4000/api (`http://localhost:4000/api-docs` for Swagger UI)
- **GraphQL**: http://localhost:4000/graphql  
- **Postgres**: `localhost:5432` / **Mongo**: `localhost:27017`

The backend runs **`prisma migrate deploy`**, **`node dist/seed.mjs`** (idempotent upserts), then starts **`node dist/main.mjs`**. Postgres and Mongo must become healthy before the API container starts listening.

To point the SPA at a different API origin (e.g. LAN IP), rebuild the frontend:

```bash
docker compose build --build-arg VITE_API_BASE=http://YOUR_HOST:4000 frontend && docker compose up -d frontend
```

## Bring up infra (databases only, for local dev)
```bash
docker compose up -d postgres mongo
```

## Configure environment
Copy `.env.example` to `.env` and update values if needed.

## Backend
```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```
GraphQL at http://localhost:4000/graphql, REST at http://localhost:4000/api

## Frontend
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173
