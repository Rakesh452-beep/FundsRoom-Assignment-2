# Deployment Notes

## Single-process production build (recommended)

Backend serves the compiled React SPA + `/api` from one Node process.

```bash
# 1. Backend deps, migration, seed
cd backend
npm ci
npx prisma migrate deploy   # applies migrations to DATABASE_URL
npm run seed                # creates admin/sales users + master data

# 2. Build frontend into backend/public
cd ../frontend
npm ci
npm run build

# 3. Run single process
cd ../backend
npm start                   # → http://localhost:8080
```

`src/app.js` serves `/api` first, then static `public/` with SPA fallback to `index.html`
(any non-api GET route).

## Docker Compose (optional)

```yaml
services:
  db:
    image: postgres:17
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: erpdev123
      POSTGRES_DB: erp_dev
    ports: ["5433:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
  app:
    build: .
    environment:
      DATABASE_URL: postgresql://postgres:erpdev123@db:5432/erp_dev
      JWT_SECRET: ${JWT_SECRET}
    ports: ["8080:8080"]
    depends_on: [db]
volumes:
  pgdata:
```
```bash
docker compose up --build   # then: npx prisma migrate deploy + npm run seed inside app
```

## Cloud (Neon + Render + Vercel)

- **Database**: provision on [Neon](https://neon.tech), copy the pooled `DATABASE_URL`.
- **API**: [Render](https://render.com) web service, root = `backend`, build =
  `npm ci && npx prisma migrate deploy && npm run seed`, start = `npm start`.
  Set `DATABASE_URL`, `JWT_SECRET`, `CLIENT_ORIGIN` env vars.
- **Frontend**: build with `npm run build`, serve `backend/public` from the Render service or
  deploy `frontend` on Vercel with `vite build` and `/api` rewrite to the Render URL.

When hosting the frontend separately, set `CLIENT_ORIGIN` (CORS) to the frontend origin.