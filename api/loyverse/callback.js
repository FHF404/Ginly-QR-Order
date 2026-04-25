const { getRedirectUri } = require("./_shared");

async function exchangeToken(code, req) {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: getRedirectUri(req),
    client_id: process.env.LOYVERSE_CLIENT_ID || "",
    client_secret: process.env.LOYVERSE_CLIENT_SECRET || "",
  });

  const response = await fetch("https://api.loyverse.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || text || "Token exchange failed");
  }
  return payload;
}

module.exports = async function handler(req, res) {
  const { code, error } = req.query;
  if (error) return res.status(400).send(`Loyverse authorization failed: ${error}`);
  if (!code) return res.status(400).send("Missing authorization code");

  try {
    const token = await exchangeToken(code, req);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(`<!doctype html><html><head><meta charset="utf-8"><title>Ginly QR Order Connected</title><style>body{font-family:system-ui;margin:40px;line-height:1.6}code{background:#f2f2f2;padding:2px 5px;border-radius:4px}pre{white-space:pre-wrap;background:#f7f7f7;padding:16px;border-radius:8px}</style></head><body><h1>Ginly QR Order 已连接 Loyverse</h1><p>请把下面的 <code>access_token</code> 保存到 Vercel 环境变量 <code>LOYVERSE_ACCESS_TOKEN</code>。不要公开分享。</p><pre>${JSON.stringify(token, null, 2)}</pre><p><a href="/">返回 Ginly QR Order</a></p></body></html>`);
  } catch (err) {
    res.status(500).send(`Token exchange failed: ${err.message}`);
  }
};
