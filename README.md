# Titanic City Ventures — restaurant ordering website

A full-stack restaurant storefront built around the supplied Titanic City Ventures menu PDF. The project includes a lively customer website, protected restaurant Admin, Accra-only delivery quoting, a cart and Paystack payment flow.

## What is already built

- Customer-facing home page with Titanic City Ventures branding and menu imagery extracted from the supplied PDF.
- Menu categories, search, featured dishes, price/availability handling and variant support.
- Cart with quantity controls and customer contact details.
- Google Places address autocomplete plus **Use my location**.
- Server-side delivery eligibility and fee calculation.
- Accra-only delivery geofence, editable in Admin.
- Google Routes distance when a server Maps key is configured; straight-line estimate fallback for development.
- Paystack transaction initialization from the server only.
- Paystack verification endpoint and signed webhook handling.
- Server recalculates menu prices and delivery fee at checkout; client totals are never trusted.
- Admin login, menu CRUD, cedi pricing, item options/sizes, availability, featured items, website settings, delivery settings and order-status management.
- PocketBase collections and an idempotent menu seed.
- Render Blueprint (`render.yaml`) for the Node web service and PocketBase.

## Important launch behavior

The PDF contains blank price fields, so the seed intentionally sets every menu price to `null`. A customer cannot add an unpriced item to the cart. This prevents an invented amount from ever reaching Paystack.

The restaurant dispatch coordinates and delivery rates are also intentionally blank. Set them in **Admin → Settings** before taking live delivery orders.

The initial service-bound rectangle is only a broad Accra-metro starting point:

- south: `5.45`
- north: `5.75`
- west: `-0.35`
- east: `-0.05`

Confirm and adjust these values to match the restaurant's actual coverage. The geofence deliberately excludes destinations east of the configured boundary.

## Menu seeded from the PDF

The seed creates:

- Starters: Groundnut, Spring Roll, Samosa
- Grills & Proteins: Chicken Wings / Thighs, Turkey Wings, Grilled Red Fish, Grouper, Octopus / Calamari, Gizzard, Goat Meat
- Sides: Yam Chips, Potato Chips
- Rice Meals: Chicken with Fried Rice, Assorted Fried Rice, Chicken with Jollof Rice, Assorted Jollof Rice, Chicken with Plain Rice
- Local Favourites: Banku & Tilapia, Tilapia Light Soup, Goat Meat Light Soup, Ewokple Abobitadi, Akyeke, Eba

Option groups are already created for the PDF items that show a choice or size, including grilled/fried chicken, chicken stew, and medium/large sizes.

## Local setup

Requirements: Node 20+ and a PocketBase server with superuser credentials.

Set `POCKETBASE_URL`, `POCKETBASE_ADMIN_EMAIL` and `POCKETBASE_ADMIN_PASSWORD` in `.env`. The setup command creates the required PocketBase collections; the seed command then creates the menu and default site settings.

```bash
cp .env.example .env
npm install
npm run db:setup
npm run seed
npm run dev
```

Open:

- Storefront: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`

## Render deployment

1. Push this project to a GitHub repository.
2. In Render, choose **New → Blueprint** and connect the repository.
3. Render reads `render.yaml` and asks for the PocketBase URL and secret environment variables.
4. Set:
   - `POCKETBASE_URL`
   - `POCKETBASE_ADMIN_EMAIL`
   - `POCKETBASE_ADMIN_PASSWORD`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `PAYSTACK_SECRET_KEY`
   - `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`
   - `GOOGLE_MAPS_SERVER_KEY`
5. Deploy.
6. Sign in at `/admin` and fill in:
   - official cedi prices
   - restaurant phone / WhatsApp / address
   - exact restaurant latitude and longitude
   - delivery base fee, per-km fee, minimum fee and maximum distance
   - final Accra service bounds
7. In Paystack Dashboard, set the webhook URL to:
   - `https://YOUR-DOMAIN/api/paystack/webhook`
8. Test end-to-end using Paystack **test** keys before changing `PAYSTACK_SECRET_KEY` to a live key.

## Google Maps setup

Create a Google Cloud project and enable the services required by the app:

- Maps JavaScript API
- Places API
- Routes API
- Geocoding support used by Maps JavaScript for current-location display

Use **two API keys**:

1. `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` — browser key, restricted to the restaurant website domains and only the browser APIs it needs.
2. `GOOGLE_MAPS_SERVER_KEY` — server key, stored only in Render and restricted to the Routes API.

The browser key is public by design; domain/API restrictions are essential. The Paystack secret key and Google server key must never be exposed to client-side code.

## Paystack flow

1. Customer checks out.
2. Server reloads each menu item from PocketBase and recalculates the subtotal.
3. Server recalculates delivery eligibility, route distance and fee.
4. Server creates a pending order.
5. Server initializes the Paystack transaction in pesewas.
6. Customer is redirected to Paystack.
7. `/payment/callback` verifies the transaction with Paystack.
8. `/api/paystack/webhook` independently receives signed `charge.success` events and validates the amount before marking an order paid.

## Admin controls

`/admin` includes:

- Dashboard and launch checklist
- Menu pricing and item/variant editing
- Add/delete/hide menu items
- Featured item control
- Homepage content and contacts
- Restaurant dispatch coordinates
- Delivery pricing and Accra bounds
- Pause/resume online ordering
- Order list and statuses: Paid, Preparing, Out for Delivery, Delivered, Cancelled

Admin credentials are Render environment variables, not stored in source control or the database.

## Production items still needed from the restaurant

The code is ready for these values, but they were not in the supplied PDF:

- official GHS prices for every item and option/size
- exact Titanic City Ventures dispatch address and coordinates
- official delivery pricing rules
- exact Accra coverage boundary / maximum range
- restaurant phone and WhatsApp details
- Paystack account keys
- Google Maps API keys

## Data and image storage

The original menu imagery is bundled in `/public/menu`, so it survives redeploys. Admin currently accepts an image path or image URL when changing/adding items. For frequent image uploads from nontechnical staff, add Cloudinary or another object-storage provider rather than relying on a Render web-service filesystem.

## September 2026 location + delivery update

- Dispatch origin: **Titanic City Ventures, Titanic Beach, Tema, Ghana**.
- Google Maps Place ID: `ChIJE7EZ2K-H3w8R8efP8YXbK-w`. The Routes API uses the Place ID first because Google recommends Place IDs for routing accuracy.
- The Google Place ID is the canonical dispatch origin. Optional fallback latitude/longitude can still be added from `/admin` for local development.
- Delivery remains restricted to the configured Accra service bounds.
- The delivery engine now uses a **Bolt-style dynamic model**: base fee + route distance + traffic-aware route time, then a traffic multiplier and an admin-controlled demand/weather multiplier.
- Bolt Ghana publicly describes dynamic delivery pricing as taking route distance/time, traffic, weather, courier availability and other market factors into account, but it does not publish the exact coefficients or expose a public fare-calculation API. The defaults in this project are therefore calibrated starting values, not a claim of an identical Bolt fare.
- Default starting values are GH₵4.00 base + GH₵1.50/km + GH₵0.10/route minute, GH₵10 minimum, a 50 km maximum delivery distance, traffic sensitivity `0.60`, traffic cap `1.25x`, and demand/weather multiplier `1.00x`. All can be changed from `/admin`.
