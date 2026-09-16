# Zenitek ERP — Manufacturing & Supply Platform

A web-based ERP managing the end-to-end sales pipeline for a manufacturing company:

**Customer Enquiry → Quotation → Sales Order → Inventory Reservation → Dispatch**

Built on the **PERN stack** (PostgreSQL + Express.js + React.js + Node.js) with two roles
(ADMIN, SALES_USER), JWT auth, backend RBAC, transactional inventory reservation (concurrency-safe),
PDF quotation generation, audit trail, dashboard analytics and automated tests.

---

## Tech Stack

| Layer       | Technology                                                        |
|-------------|-------------------------------------------------------------------|
| Frontend    | React 18, Vite, React Router, Tailwind CSS, Axios                 |
| Backend     | Node.js, Express, Prisma ORM, JWT, bcryptjs, Zod, pdfkit, morgan  |
| Database    | PostgreSQL (2 databases: `erp_dev`, `erp_test`)                   |
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
    components/               # layout, ui kit, forms, shared (status/inventory/timeline)
    pages/                    # Login, Dashboard, Enquiries, Quotations, SalesOrders, Inventory, Customers
    hooks/ utils/             # useDebounce, formatters, status constants
  vite.config.js              # dev proxy /api -> localhost:8080
```

---

## Database Setup

**Option A — local PostgreSQL** (this machine): a portable PostgreSQL 17.5 cluster was
initialised in `.pgdata/` and listens on `127.0.0.1:5433` (user `postgres`, password `erpdev123`).
It contains `erp_dev` and `erp_test`.

**Option B — remote URL**: set the PostgreSQL connection strings in `backend/.env`
(see `.env.example`).

### Schema overview (12 tables)

`users`, `customers`, `enquiries`, `enquiry_items`, `products`, `inventory`, `quotations`,
`quotation_items`, `sales_orders`, `sales_order_items`, `dispatches`, `dispatch_items`, plus
`audit_logs` for the activity timeline.

Key guarantees:

- Unique business numbers (`ENQ-/QT-/SO-/DISP-YYYYMM-NNNN`)
- `enquiry_id` unique in quotations → one quotation per enquiry
- `quotation_id` unique in sales_orders → one sales order per quotation (blocks duplicates at DB level)
- Foreign keys `ON DELETE RESTRICT` → no orphaned records
- Composite PKs on item tables → no duplicate product lines
- `DECIMAL(12,2)` money, integer quantities, CHECK-safe stock via guarded updates

### ER diagram

See `docs/er-diagram.md` (Mermaid).

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

See `docs/api.md` for the full endpoint table and sample request/response bodies.

### Quick reference

```
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

Jest runs against `erp_test` (migrated, isolated per run):

| #  | Test                                                                |
|----|---------------------------------------------------------------------|
| 1  | Quotation grand total is calculated by backend, not the client      |
| 2  | Draft / Rejected quotation cannot create a sales order              |
| 3  | Same quotation cannot create a duplicate sales order                |
| 4  | Cannot reserve more than available inventory                        |
| 5  | Unauthorized user cannot perform restricted operations (403 / 401)  |
| 6  | **Bonus** — simultaneous reservations cannot over-reserve (Promise.all) |

---

## Security Notes

- `bcrypt` (10 rounds) password hashing; plaintext never stored
- JWT HS256 with expiry; verified on every protected route
- Backend RBAC: `authorizeRole('ADMIN')` on confirm / dispatch / inventory-adjust — frontend
  role-based hiding is UX only, never the security boundary
- Zod validation on every body/params before controllers
- Prisma parameterised queries (SQL-injection safe), helmet headers, CORS whitelist
- Errors hide stack traces in production

## Deployment Notes

Optional extras documented for going live:
- **Docker Compose** (`docs/deployment.md`) — `postgres` service + API container
- **Cloud (Neon + Render + Vercel)** — env var switch; build script emits `backend/public`

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