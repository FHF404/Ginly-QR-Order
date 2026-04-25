const { baseUrl } = require("./_shared");

const demoItems = [
  { id: "demo-khao-man-gai", item_name: "Khao Man Gai", category_name: "Rice", description: "泰式鸡饭，配姜酱和清汤", variants: [{ variant_id: "demo-khao-man-gai", name: "Regular", default_price: 65 }] },
  { id: "demo-pad-thai", item_name: "Pad Thai", category_name: "Noodles", description: "泰式炒河粉，酸甜酱汁和花生碎", variants: [{ variant_id: "demo-pad-thai", name: "Regular", default_price: 85 }] },
  { id: "demo-tom-yum", item_name: "Tom Yum Soup", category_name: "Soup", description: "冬阴功汤，香茅、青柠和辣味汤底", variants: [{ variant_id: "demo-tom-yum", name: "Regular", default_price: 120 }] },
  { id: "demo-iced-tea", item_name: "Thai Iced Tea", category_name: "Drinks", description: "泰式奶茶，可备注少糖或少冰", variants: [{ variant_id: "demo-iced-tea", name: "Regular", default_price: 45 }] },
];

async function loyverseGet(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${process.env.LOYVERSE_ACCESS_TOKEN}` },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || payload.message || "Loyverse request failed");
  return payload;
}

module.exports = async function handler(req, res) {
  if (!process.env.LOYVERSE_ACCESS_TOKEN) {
    return res.status(200).json({ source: "demo", items: demoItems });
  }

  try {
    const [itemsPayload, categoriesPayload] = await Promise.all([
      loyverseGet("/v1.0/items?limit=250"),
      loyverseGet("/v1.0/categories?limit=250").catch(() => ({ categories: [] })),
    ]);
    const categoryMap = new Map((categoriesPayload.categories || []).map((category) => [category.id, category.name]));
    const items = (itemsPayload.items || []).map((item) => ({
      ...item,
      category_name: item.category_name || categoryMap.get(item.category_id) || "Menu",
    }));
    res.status(200).json({ source: "loyverse", items });
  } catch (err) {
    res.status(200).json({ source: "demo", items: demoItems, error: err.message });
  }
};
