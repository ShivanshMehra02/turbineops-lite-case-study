# API Documentation

## Authentication

- **Login (REST):** `POST /api/auth/login` with JSON `{ "email", "password" }`.
- **Access:** Send `Authorization: Bearer <accessToken>` on protected REST routes, GraphQL (`POST /graphql`), and SSE (`GET /api/events`).
- **Roles:** `ADMIN` (full), `ENGINEER` (read + write), `VIEWER` (read-only). Disabled accounts (`User.disabledAt`) are rejected at login and on each authenticated request.

### Example: login

```bash
curl -s -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

### Example: call protected REST

```bash
TOKEN="<paste accessToken>"
curl -s "http://localhost:4000/api/turbines?page=1&limit=20&name=T-" \
  -H "Authorization: Bearer $TOKEN"
```

### Example: GraphQL with Bearer token

```bash
curl -s http://localhost:4000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"query":"query($id:ID!){ inspection(id:$id){ id } }","variables":{"id":"..."}}'
```

Seeded accounts (after `npm run seed`): `admin@example.com` / `admin123`, `eng@example.com` / `engineer123`, `viewer@example.com` / `viewer123`.

## Turbines

REST (requires Bearer):

| Method | Path | RBAC | Notes |
|--------|------|------|--------|
| GET | `/api/turbines` | VIEWER+ | Paginated JSON `{ items, totalCount, page, limit }`. Query: `page`, `limit` (max 100), `name` (case-insensitive substring). |
| GET | `/api/turbines/:id` | VIEWER+ | Single turbine; `404` if missing. |
| POST | `/api/turbines` | ENGINEER+ | Create (`name` required; optional `manufacturer`, `mwRating`, `lat`, `lng`, nullable fields allowed). |
| PATCH | `/api/turbines/:id` | ENGINEER+ | Partial update; at least one field required. |
| DELETE | `/api/turbines/:id` | ADMIN | Deletes when no dependent inspections; otherwise `409`. |

GraphQL (requires Bearer):

- `turbines(page, limit, nameContains): TurbineConnection!` — same semantics as REST list.
- `turbine(id): Turbine` — nullable when missing.
- `createTurbine(input)`, `updateTurbine(id, input)`, `deleteTurbine(id)` — same RBAC as REST (`deleteTurbine` is ADMIN-only).

## REST (OpenAPI)

- Swagger UI at: `http://localhost:4000/api-docs` (`/api/docs` redirects here)
- Spec: `backend/openapi.yaml`

## GraphQL

- Endpoint: `http://localhost:4000/graphql`
- SDL: `backend/src/graphql/schema.graphql`
- Requires `Authorization: Bearer` for all operations in this starter.

Example query:

```graphql
query Example($id: ID!) {
  inspection(id: $id) {
    id
    date
    turbine { id name }
    findings { id category severity estimatedCost notes }
    repairPlan { id priority totalEstimatedCost createdAt }
  }
}
```
