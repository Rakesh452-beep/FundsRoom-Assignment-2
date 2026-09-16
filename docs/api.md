# API Documentation — Zenitek ERP

Base URL (dev): `http://localhost:8080/api`
All endpoints except `POST /api/auth/login` and `GET /health` require:

```
Authorization: Bearer <JWT>
```

## Response Envelope

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "code": "INSUFFICIENT_STOCK", "message": "..." }
```

Common error codes: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `INVALID_TOKEN` (401),
`FORBIDDEN` (403), `NOT_FOUND` (404), `INSUFFICIENT_STOCK` (400), and `409` for duplicate records.

## Endpoints

### Auth

| Method | Endpoint         | Auth | Description                        |
|--------|------------------|------|------------------------------------|
| POST   | `/auth/login`    | no   | Login → `{ token, user }`          |
| GET    | `/auth/me`       | yes  | Current token owner                |

**Login request**
```json
{ "email": "admin@erp.com", "password": "admin123" }
```
**Login response**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGci...",
    "user": { "id": 1, "email": "admin@erp.com", "name": "Admin User", "role": "ADMIN" }
  }
}
```

### Customers

| Method | Endpoint          | Auth | Description          |
|--------|-------------------|------|----------------------|
| GET    | `/customers`      | yes  | List customers       |
| POST   | `/customers`      | yes  | Create customer      |
| GET    | `/customers/:id`  | yes  | Detail (+enquiries)  |

**Create**
```json
{
  "companyName": "Zenith Engineering Pvt Ltd",
  "contactPerson": "Rahul Sharma",
  "mobile": "9876543210",
  "email": "rahul@zenith.co.in",
  "city": "Pune"
}
```

### Enquiries

| Method | Endpoint                   | Auth | Description                        |
|--------|----------------------------|------|------------------------------------|
| GET    | `/enquiries`               | yes  | List (`?status=&search=&page=&limit=`) |
| POST   | `/enquiries`               | yes  | Create enquiry + items (txn)       |
| GET    | `/enquiries/:id`           | yes  | Detail incl. items & quotation     |
| PATCH  | `/enquiries/:id/status`    | yes  | `{ status: "NEW|QUOTED|WON|LOST" }`|

**Create request** (existing customer by `id`, or inline customer object)
```json
{
  "customer": { "id": 3 },
  "items": [ { "productId": 1, "quantity": 20 } ],
  "requiredDate": "2026-10-15",
  "notes": "Urgent requirement"
}
```

### Products

| Method | Endpoint | Auth | Description          |
|--------|----------|------|----------------------|
| GET    | `/products` | yes | List product master (with inventory) |

### Inventory

| Method | Endpoint                     | Auth  | Description                |
|--------|------------------------------|-------|----------------------------|
| GET    | `/inventory`                 | yes   | Physical / Reserved / Available |
| PATCH  | `/inventory/:productId`      | ADMIN | `{ quantity: ±delta }`     |

**Inventory list item**
```json
{
  "productId": 1,
  "product": { "id": 1, "code": "RM-001", "name": "Cold Rolled Steel Coil", "unit": "MT" },
  "physicalQty": 115,
  "reservedQty": 0,
  "availableQty": 115,
  "lowStock": false
}
```

### Quotations

| Method | Endpoint                       | Auth | Description                          |
|--------|--------------------------------|------|--------------------------------------|
| GET    | `/quotations`                  | yes  | List (`?status=&page=&limit=`)       |
| POST   | `/quotations`                  | yes  | Create — **totals computed backend** |
| GET    | `/quotations/:id`              | yes  | Detail + items + audit logs          |
| PATCH  | `/quotations/:id/status`       | yes  | `{ status: "DRAFT|SENT|ACCEPTED|REJECTED" }` |
| GET    | `/quotations/:id/pdf`          | yes  | PDF quotation (application/pdf)      |
| POST   | `/quotations/:id/convert`      | yes  | Convert ACCEPTED quotation → SO      |

**Create request**
```json
{
  "enquiryId": 2,
  "items": [ { "productId": 1, "qty": 20, "unitPrice": 55000 } ],
  "discountPct": 5,
  "gstPct": 18,
  "validUntil": "2026-10-31"
}
```
**Response** — `data.grandTotal` is authoritative. Any client-supplied `grandTotal` is ignored:
`lineAmount = qty × unitPrice`, `net = lineAmount × (1 − discount/100)`,
`total = net × (1 + gst/100)`, `grandTotal = Σ total`.

**Convert errors**
- `400 QUOTATION_NOT_ACCEPTED` — only ACCEPTED quotations convert
- `409 SALES_ORDER_EXISTS` — a sales order already exists for the quotation

### Sales Orders

| Method | Endpoint                    | Auth  | Description                                  |
|--------|-----------------------------|-------|----------------------------------------------|
| GET    | `/sales-orders`             | yes   | List (`?status=&page=&limit=`)               |
| GET    | `/sales-orders/:id`         | yes   | Detail + items + inventory + dispatches      |
| POST   | `/sales-orders/:id/confirm` | ADMIN | Reserve inventory (transactional, guarded)   |
| POST   | `/sales-orders/:id/dispatch`| ADMIN | Dispatch (transactional, no double-dispatch) |
| POST   | `/sales-orders/:id/cancel`  | ADMIN | Cancel (releases reservation if confirmed)   |

**Confirm** — guarded `UPDATE inventory SET reservedQty += qty WHERE available >= qty` per line.
Failure → `400 INSUFFICIENT_STOCK`, full rollback.

**Dispatch**
```json
{ "vehicleNo": "MH-12-AB-1234", "driver": "Test Driver" }
```

### Dispatches & Dashboard

| Method | Endpoint | Auth | Description                     |
|--------|----------|------|---------------------------------|
| GET    | `/dispatches` | yes | Recent dispatch records    |
| GET    | `/dashboard`  | yes | Pipeline funnel, revenue, top products, alerts |

---

## Transaction Guarantees

| Operation          | Transaction   | Notes                                        |
|--------------------|---------------|----------------------------------------------|
| Create enquiry     | Yes           | enquiry + all items all-or-nothing           |
| Create quotation   | Yes           | items + totals + enquiry→QUOTED + audit      |
| Convert to SO      | Yes           | one-per-quotation guard + enquiry→WON        |
| Confirm / reserve  | Yes           | serialised guarded row updates, rollback     |
| Dispatch           | Yes           | physical−/reserved− with guards, no duplicates |
| Inventory adjust   | Yes           | CHECK available ≥ 0 + audit                  |