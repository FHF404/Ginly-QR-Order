# Ginly QR Order

Vercel-ready MVP for Ginly QR Order, a Loyverse POS QR table ordering integration.

## Current MVP

- Customer QR ordering page with table/session URL parameters
- Staff console to create a table QR link
- Cart, notes, order submission, and local order list
- Demo menu fallback when Loyverse is not configured
- Vercel API routes for Loyverse OAuth, menu fetch, and receipt sync attempt

## Deploy

1. Push this repository to GitHub.
2. Import the repository in Vercel.
3. Use the Vercel domain as the Loyverse redirect URL:

```text
https://your-vercel-domain.vercel.app/api/loyverse/callback
```

## Environment Variables

Set these in Vercel Project Settings -> Environment Variables:

```text
LOYVERSE_CLIENT_ID=
LOYVERSE_CLIENT_SECRET=
LOYVERSE_REDIRECT_URI=https://your-vercel-domain.vercel.app/api/loyverse/callback
LOYVERSE_ACCESS_TOKEN=
LOYVERSE_STORE_ID=
```

`LOYVERSE_CLIENT_ID` and `LOYVERSE_CLIENT_SECRET` are used only by serverless API routes. Do not put the secret in frontend code.

`LOYVERSE_ACCESS_TOKEN` and `LOYVERSE_STORE_ID` are optional for the demo menu, but required before real Loyverse order sync can be tested.
