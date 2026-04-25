const { getRedirectUri } = require("./_shared");

module.exports = async function handler(req, res) {
  const clientId = process.env.LOYVERSE_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: "Missing LOYVERSE_CLIENT_ID" });
  }

  const url = new URL("https://api.loyverse.com/oauth/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", getRedirectUri(req));
  url.searchParams.set("scope", "ITEMS_READ PAYMENT_TYPES_READ RECEIPTS_READ RECEIPTS_WRITE STORES_READ MERCHANT_READ");

  res.writeHead(302, { Location: url.toString() });
  res.end();
};

