const baseUrl = "https://api.loyverse.com";

function getRedirectUri(req) {
  if (process.env.LOYVERSE_REDIRECT_URI) return process.env.LOYVERSE_REDIRECT_URI;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  return `${proto}://${host}/api/loyverse/callback`;
}

module.exports = { baseUrl, getRedirectUri };
