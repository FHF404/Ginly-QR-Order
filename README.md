# Ginly QR Order

Ginly QR Order is a QR table ordering MVP for restaurants that already use Loyverse POS.

The goal is simple: let a restaurant use its existing Loyverse menu, prices, and POS account, then add a customer-facing QR ordering layer for dine-in tables.

## Product Idea

A restaurant staff member opens a table, gives the customer a QR code, and the customer orders from their phone. The customer can add food multiple times during the meal. All submitted items stay under the same table bill. When the customer is ready to pay, staff closes the table and sends one summarized bill to Loyverse.

This avoids building a full POS from scratch. Loyverse remains the source for menu items, prices, stores, payment types, and final sales records.

## Current MVP Flow

1. Staff opens Ginly QR Order and enters a table number.
2. Ginly QR Order generates a table/session QR link.
3. Customer scans the QR code and sees the menu.
4. Menu items are loaded from Loyverse when an access token is configured.
5. Customer adds items to the cart and taps `加入本桌订单`.
6. The submitted items are appended to the current table bill.
7. The same customer can order again from the same QR code, and the new items are merged into the same table bill.
8. Staff opens the staff console and sees the table summary.
9. When the customer pays, staff taps `买单汇总到 Loyverse`.
10. Ginly QR Order creates one summarized Loyverse receipt for that table and closes the QR session.

## What Loyverse Handles

- Menu items
- Categories
- Prices
- Store data
- Payment types
- Final receipt / sales record
- Existing POS workflow after the receipt is created

## What Ginly QR Order Handles

- QR table link generation
- Customer ordering UI
- Cart and notes
- Table session state
- Grouping multiple customer submissions into one table bill
- Final checkout sync to Loyverse
- Staff-side table view

## Important Finding About Printing

We tested the Loyverse API integration and confirmed that API-created receipts can appear inside Loyverse, but they do not automatically trigger Loyverse POS kitchen or receipt printing.

This is a Loyverse platform limitation, not a bug in Ginly QR Order. Loyverse community answers indicate that receipts created through the API cannot be automatically printed by Loyverse POS, and Open Tickets cannot be created through the API.

Practical result:

```text
Customer QR order -> Ginly QR Order -> Loyverse receipt record works
Customer QR order -> Loyverse automatic kitchen printer does not work
```

To support automatic kitchen printing later, Ginly QR Order will need its own print bridge or kitchen display workflow.

## Current Technical State

This repository is a Vercel-ready MVP using:

- Static frontend: `index.html`, `styles.css`, `app.js`
- Vercel Serverless Functions under `api/loyverse/`
- Loyverse OAuth authorization
- Loyverse menu fetch
- Loyverse receipt creation at checkout
- Browser local storage for the current MVP table bill

## Current Limitation

The current table bill is stored in the browser with `localStorage`.

That means this first MVP is useful for testing the user flow, but it is not yet a real multi-device restaurant system. If the customer orders on one phone and staff opens the staff console on another device, the staff device will not automatically see that customer phone's local bill.

The next production step is to add a shared cloud database so all devices see the same table/session bill in real time.

Recommended next database options:

- Supabase
- Firebase
- Vercel Postgres / Neon

## Deployment

1. Push this repository to GitHub.
2. Import the repository in Vercel.
3. Set the Loyverse Redirect URL to:

```text
https://your-vercel-domain.vercel.app/api/loyverse/callback
```

For the current deployment, the domain is:

```text
https://ginly-qr-order.vercel.app
```

So the Loyverse Redirect URL should be:

```text
https://ginly-qr-order.vercel.app/api/loyverse/callback
```

## Vercel Environment Variables

Set these in Vercel Project Settings -> Environment Variables:

```text
LOYVERSE_CLIENT_ID=
LOYVERSE_CLIENT_SECRET=
LOYVERSE_REDIRECT_URI=https://ginly-qr-order.vercel.app/api/loyverse/callback
LOYVERSE_ACCESS_TOKEN=
LOYVERSE_STORE_ID=
LOYVERSE_PAYMENT_TYPE_ID=
```

Required for OAuth:

- `LOYVERSE_CLIENT_ID`
- `LOYVERSE_CLIENT_SECRET`
- `LOYVERSE_REDIRECT_URI`

Required for real menu and receipt sync:

- `LOYVERSE_ACCESS_TOKEN`

Optional:

- `LOYVERSE_STORE_ID`
- `LOYVERSE_PAYMENT_TYPE_ID`

If `LOYVERSE_STORE_ID` is missing, the API uses the first Loyverse store. If `LOYVERSE_PAYMENT_TYPE_ID` is missing, the API tries to use the first cash payment type.

Never commit real app secrets or access tokens to GitHub.

## Loyverse Authorization Steps

1. Add `LOYVERSE_CLIENT_ID`, `LOYVERSE_CLIENT_SECRET`, and `LOYVERSE_REDIRECT_URI` in Vercel.
2. Redeploy the Vercel project.
3. Open:

```text
https://ginly-qr-order.vercel.app/api/loyverse/auth
```

4. Approve the app in Loyverse.
5. Copy the returned `access_token`.
6. Add it to Vercel as `LOYVERSE_ACCESS_TOKEN`.
7. Redeploy again.
8. Check:

```text
https://ginly-qr-order.vercel.app/api/loyverse/status
```

Expected result after token setup:

```json
{
  "app": "Ginly QR Order",
  "loyverseClientConfigured": true,
  "loyverseTokenConfigured": true,
  "storeConfigured": false
}
```

`storeConfigured` can be `false` because the app can auto-select the first store.

## Recommended Product Roadmap

### Phase 1: Current MVP

- Read menu from Loyverse
- Customer QR ordering page
- Staff table QR generation
- Same-table bill grouping
- Final checkout sync to Loyverse

### Phase 2: Real Restaurant Workflow

- Add cloud database for shared table sessions
- Staff dashboard shows all active tables
- Kitchen view shows new submitted items
- Statuses: new, preparing, served, paid
- Sound notification for new orders
- Proper table close / reopen flow

### Phase 3: Printing

Because Loyverse API receipts do not auto-print, build one of these:

- Kitchen Display Screen: browser-based KDS for kitchen staff
- Ginly Print Bridge: small local app/device that listens for new orders and prints to a kitchen printer
- Browser print mode: staff device prints new kitchen tickets manually or semi-automatically

### Phase 4: Commercialization

- Restaurant onboarding flow
- Per-store settings
- Multi-language UI: Thai, Chinese, English
- Subscription billing
- Terms of service and privacy policy
- Token encryption and account management

## Business Notes

This product is a restaurant software tool, not a food delivery marketplace and not a payment processor.

The intended business model is SaaS for restaurants that already use Loyverse. The restaurant remains responsible for food licensing, store operation, customer payment, and tax handling. Ginly QR Order only provides software for QR ordering and POS integration.

Do not process customer payments or hold restaurant funds unless proper payment compliance is handled through a licensed payment provider.
