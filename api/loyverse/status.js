module.exports = async function handler(req, res) {
  res.status(200).json({
    app: "Ginly QR Order",
    loyverseClientConfigured: Boolean(process.env.LOYVERSE_CLIENT_ID && process.env.LOYVERSE_CLIENT_SECRET),
    loyverseTokenConfigured: Boolean(process.env.LOYVERSE_ACCESS_TOKEN),
    storeConfigured: Boolean(process.env.LOYVERSE_STORE_ID),
  });
};
