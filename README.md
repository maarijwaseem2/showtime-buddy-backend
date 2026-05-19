# CineSlot API (NestJS + PostgreSQL + TypeORM)

Movie ticket booking backend for the Showtime Buddy frontend.

## Setup

1. Copy environment file and set your PostgreSQL credentials:

```bash
cp .env.example .env
```

2. Create the database:

```sql
CREATE DATABASE cineslot;
```

3. Run migrations:

```bash
npm run migration:run
```

4. Seed movies, cinemas, showtimes, and admin user:

```bash
npm run seed
```

5. Start the API:

```bash
npm run start:dev
```

API base URL: `http://localhost:3000/api`  
Posters served from: `http://localhost:3000/uploads/posters/`

## Default admin (after seed)

- Email: `admin@cineslot.com` (or `ADMIN_EMAIL` in `.env`)
- Password: `admin123` (or `ADMIN_PASSWORD` in `.env`)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Dev server with watch |
| `npm run build` | Production build |
| `npm run migration:run` | Apply TypeORM migrations |
| `npm run migration:revert` | Revert last migration |
| `npm run seed` | Seed data + copy posters from frontend assets |

## Main endpoints

- `POST /api/auth/register` — Sign up
- `POST /api/auth/login` — Login (returns JWT)
- `GET /api/auth/me` — Current user (Bearer token)
- `GET /api/movies` — List movies (query: status, genre, language, q)
- `GET /api/movies/:slug` — Movie detail
- `GET /api/movies/:slug/showtimes?date=YYYY-MM-DD` — Available slots (full slots hidden)
- `GET /api/showtimes/:id/seats` — Seat availability
- `POST /api/bookings` — Create booking (auth required)
- `GET /api/bookings/me` — User bookings
- Admin routes under `/api/admin/*` (ADMIN role)

## Deploy on Render

1. Create a **PostgreSQL** database on Render, then **link** it to your web service (Environment → Add from database). That sets `DATABASE_URL`.
2. Set these environment variables on the web service:
   - `JWT_SECRET` — long random string
   - `NODE_ENV=production`
   - `DATABASE_RUN_MIGRATIONS=true` — on first deploy (or run migrations manually), then set back to `false`
   - `CORS_ORIGINS` — your frontend URL(s), comma-separated
3. **Start command:** `npm run start:prod` (not `npm run start`)
4. **Build command:** `npm install && npm run build`
5. Render sets `PORT` automatically; the app reads it in `main.ts`.

If you see `ECONNREFUSED` on `127.0.0.1:5432`, the database is not linked or `DATABASE_URL` / `DATABASE_HOST` is missing.

## Frontend

Set in `showtime-buddy-frontend/.env`:

```
VITE_API_URL=http://localhost:3000/api
```
