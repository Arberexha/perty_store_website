# Perty Print

Custom printing shop for Kosovo. The working specification is in [PROJECT_SPEC.md](PROJECT_SPEC.md).

## Requirements

- Node.js 24 or newer
- PostgreSQL 15 or newer

## Local setup

1. Run `npm install`.
2. In PowerShell, run `Copy-Item .env.example .env`. Edit `.env` and set a unique `LOCAL_DB_PASSWORD`, put the same password in `DATABASE_URL`, and set `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` of at least 12 characters. The `.env` file is ignored by Git.
3. Start PostgreSQL. With Docker Desktop running, `docker compose up -d database` starts the included local database on `127.0.0.1:5433`; otherwise create the database named in `DATABASE_URL` yourself. The sample `DATABASE_URL` matches the Docker setup after you replace its password in both places.
4. Run `npm run db:migrate`.
5. Run `npm run db:seed-admin` once to create the shop owner login. The command does not overwrite an existing account.
6. Run `npm run dev` and open `http://localhost:3000`.

The storefront and account pages are implemented. Admin Products controls the storefront catalog: create a product, select a Pen, T-shirt, Hat, or Lighter design studio, then set its status to Published. Draft and archived products do not appear. Each published product has its own page at `/design/<product-slug>`; the older `/design/pens`, `/design/shirts`, `/design/hats`, and `/design/lighters` links still resolve to published products of those types. The selected studio provides its existing photo, colors, and editing tools, so this workflow does not create new product photos or print areas. The Design Lab lets visitors add and edit text, remove plain backgrounds from uploads, add clipart, manage layers, undo changes, inspect an angled perspective, and save or share a mockup. T-shirts also have front, left-chest, back, and sleeve areas and a names-and-numbers roster. Design requests record the exact catalog product and show it in `/admin/design-requests` alongside the artwork and preview. Product colors and artwork placement are visual approximations; the angled view is not a production 3D model. Visitors can send requests for non-restricted products with contact details and quantity. Requests do not set a price or take payment. The admin panel at `/admin` also includes dashboard totals and charts, category and product management, variants and quantity prices, quotes, orders, artwork records, customers, pickup locations, and shipping zones. Paid checkout is not active yet. Lighters are 18+ and are excluded from customer ordering.
The Docker credentials and `.env.example` values are only for local development; use different credentials in production.

## Checks

Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`. Run `npm run test:e2e` for browser checks of the storefront and design pages; Playwright uses an existing development server on port 3000 or starts one. With the development server and database running, `npm run smoke:admin` checks all admin routes using a temporary admin session and removes the test account afterward.

## Project layout

- `src/app` contains pages, layouts, route handlers, and admin actions.
- `src/features/designer` contains the product designer UI, product definitions, canvas rendering, and its stylesheet.
- `src/components` contains components shared outside the designer; `src/lib` contains application and server utilities.
- `db/migrations` contains numbered database changes; `scripts` contains setup and maintenance commands.
- `tests` contains browser checks; unit tests live beside the code they cover in `src`.
- `public` contains served images and fonts. Local design reference collections are excluded from the repository.

## Database changes

Add numbered SQL files to `db/migrations`, then run `npm run db:migrate`. Applied migrations are recorded in `schema_migrations`. Treat applied files as immutable; add another migration for later changes.
