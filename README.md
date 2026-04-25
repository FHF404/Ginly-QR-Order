# Ginly QR Order

Static Vercel-ready prototype page for Ginly QR Order, a Loyverse POS QR table ordering integration.

## Deploy

1. Push this repository to GitHub.
2. Import the repository in Vercel.
3. Use the Vercel domain as the Loyverse redirect URL:

```text
https://your-vercel-domain.vercel.app/api/loyverse/callback
```

The callback route currently rewrites to `callback.html` as a placeholder. A real backend can replace it later to exchange the Loyverse OAuth `code` for an access token.
