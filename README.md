# Zenitek ERP — Manufacturing & Supply Platform

> **Live demo:** https://fundsroom-assignment-2.onrender.com

A web-based ERP managing the end-to-end sales pipeline for a manufacturing company:

**Customer Enquiry → Quotation → Sales Order → Inventory Reservation → Dispatch**

Built on the **PERN stack** (PostgreSQL + Express.js + React.js + Node.js) with two roles
(ADMIN, SALES_USER), JWT auth, backend RBAC, transactional inventory reservation (concurrency-safe),
PDF quotation generation, audit trail, dashboard analytics and automated tests.

The UI is a clean **charcoal & white** design system (Inter type) with four core screens —
**Enquiries, Quotations, Sales Orders** plus an **admin-only Dashboard and Dispatch module**.

---

## Tech Stack

| Layer       | Technology                                                        |
|-------------|-------------------------------------------------------------------|
| Frontend    | React 18, Vite, React Router, Tailwind CSS, Axios, Inter type     |
| Backend     | Node.js, Express, Prisma ORM, JWT, bcryptjs, Zod, pdfkit, morgan  |
| API Docs    | Swagger UI (OpenAPI 3.0) at `/api-docs`                           |
| Database    | PostgreSQL (2 databases: `erp_dev`, `erp_test`)                   |
| Design      | Charcoal & white tokens (Tailwind theme), role-aware layout       |
| Testing     | Jest + Supertest (6 tests incl. concurrency)                      |

---

## Repository Layout

```
backend/
  prisma/schema.prisma        # full data model (12 tables + enums)
  prisma/seed.js              # users, products, inventory, customers
  prisma/migrations/          # versioned SQL migrations
  src/
    config/                   # env, db (PrismaClient), constants
    middleware/               # auth(JWT), rbac, validate(Zod), errorHandler, notFound
    routes/                   # /api sub-routers per module
    controllers/              # thin HTTP layer -> service -> response
    services/                 # ALL business logic + transaction boundaries
    utils/                    # AppError, numberGenerator, calculate, money
    app.js                    # express app (testable, no listen)
    server.js                 # bootstraps server
  tests/                      # jest + supertest
  public/                     # production React build (emitted by frontend build)

frontend/
  src/
    api/                      # axios client + typed endpoint functions
    context/                  # AuthContext, ToastContext
    components/               # layout (Header/Sidebar), ui kit, forms, shared (status/inventory/timeline)
    pages/                    # Login, Dashboard*, Enquiries, Quotations, SalesOrders, Dispatch*
    hooks/ utils/             # useDebounce, formatters, status constants
  vite.config.js              # dev proxy /api -> localhost:8080

* `Dashboard` and `Dispatch` render only for ADMIN (see ProtectedRoute).
Customers and Inventory have no standalone screens — they are managed inline
inside Enquiries / Quotations / Sales Orders; master CRUD stays exposed via the API.
```

---

## Database Setup

The data layer is **defined entirely by Prisma**. `backend/prisma/schema.prisma` is the single
source of truth — every table, enum and constraint is generated from it as versioned SQL
migrations in `backend/prisma/migrations/`:

| Migration                     | Contents                                              |
|-------------------------------|-------------------------------------------------------|
| `20260916115517_init`         | all 13 models + 4 enums + indexes + unique constraints |
| `20260917090000_inventory_check` | `CHECK` guard on `inventory` (block over-reservation) |

Apply migrations and regenerate the client:
- Dev: `npx prisma migrate dev` (or `npm run migrate`) — applies new migrations and regen client
- Prod: `npx prisma migrate deploy` (or `npm run migrate:deploy`) — apply, no diff
- Reset: `npm run db:reset` — drop, re-apply all migrations and re-run seed

**Option A — local PostgreSQL** (this machine): a portable PostgreSQL 17.5 cluster was
initialised in `.pgdata/` and listens on `127.0.0.1:5433` (user `postgres`, password `erpdev123`).
It contains `erp_dev` (development) and `erp_test` (test suite).

**Option B — remote URL**: set the PostgreSQL connection strings in `backend/.env`
(see `.env.example`).

### Schema overview (13 Prisma models)

```
Prisma model → table                       Prisma model → table
User            → users                     SalesOrder       → sales_orders
Customer        → customers                 SalesOrderItem   → sales_order_items
Enquiry         → enquiries                 Dispatch         → dispatches
EnquiryItem     → enquiry_items             DispatchItem     → dispatch_items
Product         → products                  AuditLog         → audit_logs  (activity timeline)
Inventory       → inventory
Quotation       → quotations
QuotationItem   → quotation_items
```

Enums (PostgreSQL `ENUM` types): `Role` (ADMIN, SALES_USER), `EnquiryStatus`
(NEW, QUOTED, WON, LOST), `QuotationStatus` (DRAFT, SENT, ACCEPTED, REJECTED),
`SalesOrderStatus` (PENDING, CONFIRMED, DISPATCHED, CANCELLED).

### Seed data (`npm run seed` — upsert-based, safe to rerun)

- **Users**: `admin@erp.com` (ADMIN), `sales@erp.com` (SALES_USER)
- **Products (6)** with starting inventory: `RM-001`…`RM-006`
- **Customers**: Zenith Engineering Pvt Ltd, Orbit Fabricators

### Key guarantees (Prisma schema → generated DDL)

- Unique business numbers (`ENQ-/QT-/SO-/DISP-YYYYMM-NNNN`) — `@unique` number columns
- `@unique` `enquiryId` on Quotation → one quotation per enquiry
- `@unique` `quotationId` on SalesOrder → one sales order per quotation (blocks duplicates at DB level)
- Foreign keys `ON DELETE RESTRICT` → no orphaned records
- Composite `@@id` on item tables → no duplicate product lines
- `Decimal(12,2)` money, `Int` quantities
- Inventory reservation serialised with `SELECT … FOR UPDATE` row locks (service layer) plus a
  DB-level `CHECK` constraint — `CHECK ("physicalQty" >= 0 AND "reservedQty" >= 0 AND
  "reservedQty" <= "physicalQty")` — so simultaneous confirms cannot over-reserve
  (see `scripts/concurrency-proof.js`)

### ER diagram

![ER diagram](docs/er-diagram.png)

Editable Mermaid source: `docs/er-diagram.md`.

---

## Setup & Run

```bash
# 0. Ensure PostgreSQL is running and .env is configured (backend/.env)

# 1. Backend
cd backend
npm install
cp .env.example .env          # set DATABASE_URL / TEST_DATABASE_URL / JWT_SECRET
npx prisma migrate dev        # create + apply migrations (erp_dev)
npm run seed                  # sample users/products/inventory/customers

# 2. Frontend (development)
cd ../frontend
npm install
npm run dev                   # http://localhost:5173 (proxy -> :8080)

# Backend in another terminal
cd backend && npm run dev     # http://localhost:8080
```

### Production build (single process)

```bash
cd backend && npm ci && npm run build        # prisma generate + migrate deploy + seed
cd frontend && npm run build                 # emits static build into backend/public
cd backend && npm start                      # serves SPA + /api on http://localhost:8080
```

---

## Demo Credentials

| Role        | Email              | Password   |
|-------------|--------------------|------------|
| ADMIN       | `admin@erp.com`    | `admin123` |
| SALES_USER  | `sales@erp.com`    | `sales123` |

---

## Business Workflow (as implemented)

1. **Enquiry** — `NEW` state; multiple product lines; auto `ENQ-YYYYMM-NNNN`; atomic insert.
2. **Quotation** — totals computed **on the backend**:
   `lineAmount = qty × unitPrice`, `net = lineAmount × (1 − discount/100)`,
   `total = net × (1 + gst/100)`, `grandTotal = Σ total`. Client-sent totals are ignored.
   Creating a quotation flips the enquiry to `QUOTED`.
3. **Accept / Reject** — status machine `DRAFT → SENT → ACCEPTED/REJECTED`; reject flips enquiry to `LOST`.
4. **Convert to Sales Order** — only `ACCEPTED` quotations convert (`400` otherwise); one SO per
   quotation (`409` on duplicate); enquiry becomes `WON`; SO starts `PENDING`.
5. **Confirm & Reserve** — Admin only. Inside a single transaction, each line performs a guarded
   update: `WHERE available = physical − reserved ≥ qty`. Any failing guard rolls back the whole
   voucher and returns `400 INSUFFICIENT_STOCK`. PostgreSQL row locks serialise simultaneous
   reservations — see bonus test.
6. **Dispatch** — Admin only. SO must be `CONFIRMED`; no prior dispatch (`409`); each line must be
   ≤ reserved quantity; moves stock: `physical −= qty`, `reserved −= qty`; SO → `DISPATCHED`.
7. **Audit trail** — every status change / convert / confirm / dispatch / inventory adjust is
   recorded with actor, entity, before/after JSON — rendered as Activity Timeline.
8. **Dashboard** — pipeline funnel counts, revenue, top products, low-stock alerts.

---

## API Reference

Interactive **Swagger UI** is served by the backend at
**http://localhost:8080/api-docs** (OpenAPI 3.0 spec in `backend/src/config/swagger.js`).
Use the **Authorize** button with a token from `POST /api/auth/login` to try every endpoint.

The same content is documented in `docs/api.md` (endpoint table + sample request/response bodies).

### Quick reference

```
Swagger UI:  http://localhost:8080/api-docs     (OpenAPI 3.0, interactive)

POST   /api/auth/login                    → { token, user }
GET    /api/auth/me

GET    /api/customers | POST /api/customers | GET /api/customers/:id
GET    /api/enquiries | POST /api/enquiries | GET /api/enquiries/:id
PATCH  /api/enquiries/:id/status
GET    /api/products
GET    /api/inventory | PATCH /api/inventory/:productId      (ADMIN)
GET    /api/quotations | POST /api/quotations | GET /api/quotations/:id
PATCH  /api/quotations/:id/status
GET    /api/quotations/:id/pdf
POST   /api/quotations/:id/convert
GET    /api/sales-orders | GET /api/sales-orders/:id
POST   /api/sales-orders/:id/confirm       (ADMIN)
POST   /api/sales-orders/:id/dispatch      (ADMIN)
POST   /api/sales-orders/:id/cancel        (ADMIN)
GET    /api/dispatches
GET    /api/dashboard
```

Response envelope:

```json
// success
{ "success": true, "data": { ... } }
// error
{ "success": false, "code": "INSUFFICIENT_STOCK", "message": "..." }
```

---

## Testing

```bash
cd backend
npm test
```

Jest runs against `erp_test` (migrated, wiped and isolated per run) in two suites —
`tests/erp.test.js` (business rules) and `tests/concurrency.test.js` (bonus):

| #  | Test                                                                |
|----|---------------------------------------------------------------------|
| 1  | Quotation grand total is calculated by backend, not the client      |
| 2  | Draft / Rejected quotation cannot create a sales order              |
| 3  | Same quotation cannot create a duplicate sales order                |
| 4  | Cannot reserve more than available inventory                        |
| 5  | Unauthorized user cannot perform restricted operations (403 / 401)  |
| 6  | **Bonus** — simultaneous reservations cannot over-reserve (Promise.all, 100-stock vs 80+50) |

A standalone script `scripts/concurrency-proof.js` replays the same race against the
live dev database: `node scripts/concurrency-proof.js`.

---

## Security Notes

- `bcrypt` (10 rounds) password hashing; plaintext never stored
- JWT HS256 with expiry; verified on every protected route
- Backend RBAC: `authorizeRole('ADMIN')` on confirm / dispatch / inventory-adjust — frontend
  role-based hiding is UX only, never the security boundary
- Zod validation on every body/params before controllers
- Prisma parameterised queries (SQL-injection safe), helmet headers, CORS whitelist
- Errors hide stack traces in production

## Deployment

The backend serves the compiled React app (`backend/public/`) **and** `/api` from one Node
process, so the whole site runs on a single service.

### Option 1 — One-click Docker (recommended)

`docker-compose.yml` boots PostgreSQL + the API in one command and auto-runs migrations + seed:

```bash
docker compose up --build
# → frontend + API + Swagger docs at http://localhost:8080
#   /          SPA,  /api/*          REST API,  /api-docs  Swagger UI
```

Migrations and seed run on container start (`npx prisma migrate deploy && node prisma/seed.js`).

### Option 2 — Production build (no Docker)

```bash
cd backend && npm ci && npm run build      # prisma generate
npx prisma migrate deploy                  # apply migrations
npm run seed                               # users + products + inventory + customers
cd ../frontend && npm ci && npm run build  # emits static build into ../backend/public
cd ../backend && npm start                 # http://localhost:8080
```

Set `NODE_ENV=production` and a strong `JWT_SECRET` in `backend/.env`.

### Option 3 — Cloud (Neon + Render + Vercel)

- **Database**: provision on [Neon](https://neon.tech), copy the pooled `DATABASE_URL`.
- **API + SPA**: a [Render](https://render.com) web service — root `backend`, build
  `npm ci && npx prisma migrate deploy && npm run seed && cd ../frontend && npm ci --include=dev && npm run build`
  (`--include=dev` ensures devDependencies like vite install even under Render's `NODE_ENV=production`),
  start `npm start`; set `DATABASE_URL`, `JWT_SECRET`, `CLIENT_ORIGIN`, `NODE_ENV=production`.
  The frontend build emits into `backend/public`, so one service serves the SPA + `/api` + `/api-docs`.
- **Frontend only (optional)**: deploy `frontend` on Vercel with `vite build` and rewrite `/api`
  to the Render URL; set `CLIENT_ORIGIN` (CORS) to the Vercel origin.

> **Current live deployment:** https://fundsroom-assignment-2.onrender.com
> (Neon PostgreSQL + Render web service; SPA, REST API and Swagger docs all on this one URL.)

> Full walkthrough, Dockerfile details and env specifics: `docs/deployment.md`.

## Environment Variables (`backend/.env`)

```
DATABASE_URL="postgresql://USER:PASS@HOST:5432/erp_dev"
TEST_DATABASE_URL="postgresql://USER:PASS@HOST:5432/erp_test"
PORT=8080
JWT_SECRET="a-long-random-secret-string"
JWT_EXPIRES_IN="8h"
CLIENT_ORIGIN="http://localhost:5173"
BCRYPT_ROUNDS=10
```