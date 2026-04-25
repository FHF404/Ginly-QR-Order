const { baseUrl } = require("./_shared");

async function getDefaultStoreId() {
  if (process.env.LOYVERSE_STORE_ID) return process.env.LOYVERSE_STORE_ID;
  const response = await fetch(`${baseUrl}/v1.0/stores?limit=1`, {
    headers: { Authorization: `Bearer ${process.env.LOYVERSE_ACCESS_TOKEN}` },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || payload.message || "Unable to fetch stores");
  const store = payload.stores?.[0];
  if (!store) throw new Error("No Loyverse store found");
  return store.id;
}

async function getDefaultPaymentTypeId() {
  if (process.env.LOYVERSE_PAYMENT_TYPE_ID) return process.env.LOYVERSE_PAYMENT_TYPE_ID;
  const response = await fetch(`${baseUrl}/v1.0/payment_types?limit=250`, {
    headers: { Authorization: `Bearer ${process.env.LOYVERSE_ACCESS_TOKEN}` },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || payload.message || "Unable to fetch payment types");
  const paymentType = (payload.payment_types || []).find((type) => type.type === "CASH") || payload.payment_types?.[0];
  if (!paymentType) throw new Error("No Loyverse payment type found");
  return paymentType.id;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!process.env.LOYVERSE_ACCESS_TOKEN) {
    return res.status(200).json({ synced: false, error: "Missing LOYVERSE_ACCESS_TOKEN" });
  }

  try {
    const order = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const storeId = await getDefaultStoreId();
    const paymentTypeId = await getDefaultPaymentTypeId();
    const payload = {
      store_id: storeId,
      source: "Ginly QR Order",
      receipt_date: new Date().toISOString(),
      note: `Table ${order.table}${order.note ? ` - ${order.note}` : ""}`,
      line_items: order.items.map((item) => ({
        variant_id: item.variantId,
        quantity: Number(item.quantity),
        price: Number(item.price),
      })),
      payments: [
        {
          payment_type_id: paymentTypeId,
          money_amount: Number(order.total),
        },
      ],
    };

    const response = await fetch(`${baseUrl}/v1.0/receipts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.LOYVERSE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) {
      return res.status(200).json({ synced: false, error: result.error || result.message || "Loyverse receipt create failed", detail: result });
    }
    res.status(200).json({ synced: true, receiptId: result.id, receiptNumber: result.receipt_number, detail: result });
  } catch (err) {
    res.status(200).json({ synced: false, error: err.message });
  }
};


