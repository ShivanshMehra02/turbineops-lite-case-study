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
curl -s http://localhost:4000/api/turbines \
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

## REST (OpenAPI)

- Swagger UI at: `http://localhost:4000/api/docs`
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
