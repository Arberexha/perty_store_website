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

The storefront and account pages are implemented. Admin Products controls the storefront catalog: create a product, select a Pen, T-shirt, Hat, or Lighter design studio, optionally upload a product photo, then set its status to Published. Draft and archived products do not appear. An uploaded photo replaces the standard studio image on the product card and design page. In admin, drag the print rectangle over the part of the photo customers can decorate. Customer artwork is clipped to that rectangle. Uploaded photos keep their photographed color and currently support one front view; the standard studio photos retain their color options and, for T-shirts, multiple print areas and names-and-numbers roster. Product photos accept PNG, JPG, or WebP up to 5 MB. Each published product has its own page at `/design/<product-slug>`; the older `/design/pens`, `/design/shirts`, `/design/hats`, and `/design/lighters` links still resolve to published products of those types. The Design Lab lets visitors add and edit text, remove plain backgrounds from artwork uploads, add clipart, manage layers, undo changes, inspect an angled perspective, and save or share a mockup. Product colors and artwork placement are visual approximations; the angled view is not a production 3D model.

To accept a customer order, publish a non-restricted design product in Admin Products, add an active variant with a base price, then enable ordering on the product. Optionally add quantity price tiers, pickup locations, and delivery zones in Admin Settings. The designer then shows checkout with a live total for the selected variant, quantity, and fulfillment choice. Customers can place an **unpaid** order with their design and contact details. The shop arranges payment and fulfillment with the customer. Admins can review the order, download its preview and artwork, and update its status at `/admin/orders`. Orders placed while signed in appear in the customer's account; guests should save the confirmation reference. Products without ordering enabled continue to collect design requests at `/admin/design-requests`. Lighters are 18+ and cannot be ordered online.

For ready-date estimates, set a production range in business days on each product's admin page. You can also set a quantity threshold and extra production days for large orders. In Admin Settings, add transit-day ranges to delivery zones. Checkout shows the resulting pickup or delivery date range as an estimate, skipping weekends. A missing production range shows no date; a delivery zone without transit days shows only the production-ready date. The shop confirms actual timing after reviewing the unpaid order.

Signed-in customers can use **Order again** from My account for a previous order whose product is still available. The designer reopens that order's artwork and checkout choices. The customer reviews the design, current product options, current price, and ready-date estimate before placing a separate unpaid order. If the old variant or fulfillment location is unavailable, an active option is selected and the customer is told to review it. Guest orders remain accessible through their private tracking link but do not appear in My account.

For a custom design request submitted while signed in, staff can open it in Admin Design requests and enter the **total price for the requested quantity**. The system derives the per-item price for the order. Staff may attach a revised PNG proof; otherwise the submitted preview is shown. The customer sees the preview, quoted total, and offer details under **My quotes** in their account. They can request changes; staff can revise and resend the quote and proof. Accepting a quote creates an unpaid order with the approved preview and lets the customer choose pickup or an active delivery zone, with its fee added to the total. Guest design requests remain available for manual follow-up; online quote approval requires an account-linked request. Manual records created in Admin Quotes remain separate from this artwork approval flow.

To send order emails, set `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, and (if your provider requires authentication) `SMTP_USER` and `SMTP_PASSWORD` in your local `.env` or production environment. Set `SITE_URL` to the public site origin so emails include working private tracking links. Use a sender address approved by your provider. Port 465 uses TLS from connection start; other ports require STARTTLS. Restart the app after changing these settings. New orders include an inline PNG design preview, an image attachment, the product and price breakdown, fulfillment details, a private tracking link, and a reminder that payment has not been taken. Direct checkout also shows the tracking link immediately, and signed-in customers can find it in My account. Admin status changes appear on the tracking timeline and send one status email; cancellation uses the existing cancellation email. Saving a note or an unchanged status does not resend. If email is unconfigured or delivery fails, the order status still saves and the admin order page shows the email status for manual follow-up. The database records `confirmation_email_status`, `status_email_status`, and `cancellation_email_status`. Do not put SMTP passwords in Git.
Quote notification emails also use SMTP and need `SITE_URL` set to the public site origin (for example, `https://your-domain.com`) so the review link points to the right place. If email is unavailable, the quote still appears in the customer's account and the admin request page shows its email status for manual follow-up.
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
