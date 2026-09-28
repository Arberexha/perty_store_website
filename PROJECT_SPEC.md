# Custom printing shop — draft project specification

Status: **storefront, accounts, preview studios, admin management, and unpaid designer orders implemented**. Admin products marked Published appear on the storefront using one of four existing studios: pens, T-shirts, hats, or lighters. Admin can upload a front product photo and set a rectangular print area for customer text and artwork. Customers can submit designs for non-restricted products as requests, or place an unpaid order when the product has an active priced variant and ordering enabled. Staff can review order and request previews and original artwork in admin. Lighters are 18+ previews only. Online payment integration, multi-view custom product mockups, and production file handling remain in later milestones. Product naming and launch language remain open decisions.

## Goal and launch scope

Build a Kosovo-based custom printing store where customers design a product, see its preview, choose product-specific options and quantity, and place an order for delivery or pickup. The initial orderable products are T-shirts and hats, plus “plooters” once its exact product type is clarified. The catalogue can later expand to other printable products. Custom-printed lighters are an 18+ category with a browser-only preview; they remain excluded from cart and checkout.

Customers can create an account and view their orders; guest checkout will also be available. Standard products can be bought online. Admin can handle custom quote requests when a product cannot be priced automatically. No separate design-approval step is planned after checkout: the customer confirms the design shown in the editor before placing the order.

## Customer experience

- Browse products and see their available sizes, materials, colors, print areas, quantity limits, and prices. These options and pricing rules belong to each product, rather than one shared rule for the entire catalogue.
- Add text or upload an image, then move, resize, and rotate it within the printable area of a product mockup. Save the design and a preview with the order. The first editor is deliberately simple; accurate production output will use the original uploaded file plus the saved design layout.
- Review the item, quantity, price, shipping or pickup choice, and final preview at checkout. Pay online through a Kosovo-supported merchant payment provider once the shop has an approved merchant account and integration details.
- Choose delivery within the configured service area or a configured pickup location with displayed opening hours. Receive order status updates and view order history from an optional account.

## Admin experience

- Manage products, variants, print areas, mockup images, availability, and product-specific price rules (including quantity, size, and material).
- Manage customers, uploaded artwork, saved designs, quote requests, orders, payments, and fulfillment status.
- Configure pickup locations, opening hours, shipping zones/rates, and site content. Restrict access to customer files and keep an audit trail for important order and payment changes.
- Enter real prices before launch. Any sample prices used during development will be clearly marked and checkout will stay disabled for products without approved prices.

## Proposed technical approach

- One TypeScript web application using Next.js for the storefront, admin dashboard, and server API, with PostgreSQL for persistent data. This keeps the codebase manageable for one developer while preserving clear boundaries between customer, admin, and server code.
- Database migrations and a typed data layer; object storage for private customer uploads and generated previews. Never treat a browser-supplied total as authoritative: calculate prices and validate product options on the server.
- A small product-editor component with per-product printable regions. Store editable layout data and the original artwork so designs can be reopened and prepared for print.
- A payment adapter so the actual Kosovo merchant gateway can be added without rewriting checkout. The provider and its checkout/webhook contract must be confirmed before live online payments are enabled.
- Accessible, responsive design with a clean visual identity. Working name: **Perty Print** until you choose a brand name.

## Working assumptions to confirm

- Use euro pricing. The launch language is still to be confirmed; foundation screens currently use English. Start shipping within Kosovo only unless the owner specifies otherwise; structure text so another language can be added.
- Accounts are optional; guest checkout is allowed. Confirmed by the owner.
- “Firelighters” means lighters. They are 18+ and must remain outside customer ordering. “Plooters” is still unclear and will not have an active checkout flow before its product type, variants, and print method are confirmed.
- Pickup addresses and opening hours will be entered in admin before launch.
- A business merchant account and payment-gateway credentials will be supplied later. Live payments depend on that external setup.

## Implementation milestones

1. **Foundation (implemented):** App setup, visual system, identity schema/migration, admin seed, customer authentication, and shared validation. Automated checks cover the identity migration and account credentials; live PostgreSQL verification remains to be done when a database is running.
2. **Catalogue and admin (partly implemented):** Admin dashboard, product/variant/price management, category restrictions, pickup and shipping settings, quotes, orders, files, customers, and audit records are implemented. Storefront browsing, product mockups, and print areas remain. Verify product-specific option and pricing behavior.
3. **Design editor and files:** Private artwork upload, file validation, editor, saved layout/preview, and safe file retrieval for admin. Verify invalid files, bounds, and reopening saved designs.
4. **Checkout and payments (partly implemented):** Direct order placement from the designer, server-calculated totals, delivery/pickup, order creation, account order history, and admin artwork review are implemented. Cart, payment-provider integration, callback handling, and customer notifications remain. Verify duplicate or failed payment notifications when payments are added.
5. **Operations and launch:** Order, quote, customer, and fulfillment dashboards; notifications; end-to-end checks; deployment instructions and production configuration.

Each milestone will include a summary of changed files, run instructions, test results, and the next decision needed from the owner.
