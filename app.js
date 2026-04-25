const fallbackMenu = [
  { id: "demo-khao-man-gai", variantId: "demo-khao-man-gai", name: "Khao Man Gai", category: "Rice", description: "泰式鸡饭，配姜酱和清汤", price: 65 },
  { id: "demo-pad-thai", variantId: "demo-pad-thai", name: "Pad Thai", category: "Noodles", description: "泰式炒河粉，酸甜酱汁和花生碎", price: 85 },
  { id: "demo-tom-yum", variantId: "demo-tom-yum", name: "Tom Yum Soup", category: "Soup", description: "冬阴功汤，香茅、青柠和辣味汤底", price: 120 },
  { id: "demo-iced-tea", variantId: "demo-iced-tea", name: "Thai Iced Tea", category: "Drinks", description: "泰式奶茶，可备注少糖或少冰", price: 45 },
];

const params = new URLSearchParams(window.location.search);
const state = {
  menu: [],
  category: "All",
  cart: new Map(),
  table: params.get("table") || "08",
  session: params.get("session") || "demo",
};

const els = {
  currentTable: document.getElementById("current-table"),
  sessionStatus: document.getElementById("session-status"),
  menuSource: document.getElementById("menu-source"),
  categoryTabs: document.getElementById("category-tabs"),
  menuGrid: document.getElementById("menu-grid"),
  cartCount: document.getElementById("cart-count"),
  cartItems: document.getElementById("cart-items"),
  cartTotal: document.getElementById("cart-total"),
  orderNote: document.getElementById("order-note"),
  submitResult: document.getElementById("submit-result"),
  tableInput: document.getElementById("table-input"),
  qrImage: document.getElementById("qr-image"),
  sessionLink: document.getElementById("session-link"),
  ordersList: document.getElementById("orders-list"),
};

const money = new Intl.NumberFormat("en-TH", { style: "currency", currency: "THB" });
const getSessionKey = () => `ginly-session-${state.session}`;
const getOrders = () => JSON.parse(localStorage.getItem("ginly-orders") || "[]");
const saveOrders = (orders) => localStorage.setItem("ginly-orders", JSON.stringify(orders));
const isSessionClosed = () => localStorage.getItem(getSessionKey()) === "closed";

function setView(view) {
  document.querySelectorAll(".nav-button").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  document.querySelectorAll(".app-view").forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === view));
}

function itemInitial(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function normalizeItems(items) {
  return items
    .flatMap((item) => {
      const variants = item.variants?.length ? item.variants : [item];
      return variants.map((variant) => ({
        id: variant.variant_id || item.id || item.item_id || variant.id,
        variantId: variant.variant_id || variant.id || item.variant_id || item.id,
        name: variant.name && variant.name !== "Regular" ? `${item.item_name || item.name} - ${variant.name}` : item.item_name || item.name,
        category: item.category_name || item.category || "Menu",
        description: item.description || "来自 Loyverse 菜单",
        price: Number(variant.default_price ?? variant.price ?? item.price ?? 0),
      }));
    })
    .filter((item) => item.id && item.name);
}

async function loadMenu() {
  els.menuSource.textContent = "正在加载菜单...";
  try {
    const response = await fetch("/api/loyverse/menu");
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Menu request failed");
    state.menu = normalizeItems(payload.items || []);
    if (state.menu.length === 0) state.menu = fallbackMenu;
    els.menuSource.textContent = payload.source === "loyverse" ? "菜单来自 Loyverse" : "当前使用示例菜单";
  } catch {
    state.menu = fallbackMenu;
    els.menuSource.textContent = "未连接 Loyverse，当前使用示例菜单";
  }
  renderCategories();
  renderMenu();
}

function renderCategories() {
  const categories = ["All", ...new Set(state.menu.map((item) => item.category))];
  els.categoryTabs.innerHTML = categories.map((category) => `<button class="category-tab ${category === state.category ? "active" : ""}" data-category="${category}">${category}</button>`).join("");
}

function renderMenu() {
  const items = state.category === "All" ? state.menu : state.menu.filter((item) => item.category === state.category);
  els.menuGrid.innerHTML = items.map((item) => `
    <article class="item-card">
      <div class="item-art">${itemInitial(item.name)}</div>
      <div>
        <h3>${item.name}</h3>
        <p>${item.description || "餐厅菜单项目"}</p>
        <div class="item-footer">
          <span class="price">${money.format(item.price || 0)}</span>
          <button class="add-button" data-add="${item.id}" type="button" title="加入购物车">+</button>
        </div>
      </div>
    </article>`).join("");
}

function addToCart(id) {
  if (isSessionClosed()) {
    els.submitResult.className = "submit-result error";
    els.submitResult.textContent = "这个桌码已经失效，请联系店员重新开桌。";
    return;
  }
  const item = state.menu.find((entry) => entry.id === id);
  if (!item) return;
  const current = state.cart.get(id) || { item, quantity: 0 };
  current.quantity += 1;
  state.cart.set(id, current);
  renderCart();
}

function updateQuantity(id, delta) {
  const current = state.cart.get(id);
  if (!current) return;
  current.quantity += delta;
  if (current.quantity <= 0) state.cart.delete(id);
  renderCart();
}

function getCartSummary() {
  const lines = [...state.cart.values()];
  const quantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  const total = lines.reduce((sum, line) => sum + line.quantity * (line.item.price || 0), 0);
  return { lines, quantity, total };
}

function renderCart() {
  const { lines, quantity, total } = getCartSummary();
  els.cartCount.textContent = quantity ? `${quantity} 件菜品` : "还没有选择菜品";
  els.cartTotal.textContent = money.format(total);
  els.cartItems.innerHTML = lines.length
    ? lines.map(({ item, quantity: qty }) => `
      <div class="cart-row">
        <div><h3>${item.name}</h3><p>${money.format(item.price || 0)}</p></div>
        <div class="qty-control">
          <button data-qty="${item.id}" data-delta="-1" type="button">-</button>
          <strong>${qty}</strong>
          <button data-qty="${item.id}" data-delta="1" type="button">+</button>
        </div>
      </div>`).join("")
    : `<div class="empty-state">从左侧菜单选择菜品</div>`;
}

async function submitOrder() {
  const { lines, quantity, total } = getCartSummary();
  if (!quantity) return;
  if (isSessionClosed()) {
    els.submitResult.className = "submit-result error";
    els.submitResult.textContent = "这个桌码已经失效，请联系店员重新开桌。";
    return;
  }
  const order = {
    id: `GQO-${Date.now().toString().slice(-6)}`,
    table: state.table,
    session: state.session,
    note: els.orderNote.value.trim(),
    total,
    createdAt: new Date().toISOString(),
    items: lines.map(({ item, quantity: qty }) => ({ id: item.id, variantId: item.variantId, name: item.name, quantity: qty, price: item.price || 0 })),
  };
  els.submitResult.className = "submit-result";
  els.submitResult.textContent = "正在提交订单...";
  let syncMessage = "订单已在 Ginly QR Order 中创建。";
  try {
    const response = await fetch("/api/loyverse/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(order) });
    const payload = await response.json();
    syncMessage = payload.synced ? `订单已同步 Loyverse，编号 ${payload.receiptNumber || payload.receiptId || order.id}。` : `订单已创建；Loyverse 暂未同步：${payload.error || "未配置 access token"}`;
  } catch (error) {
    syncMessage = `订单已创建；Loyverse 暂未同步：${error.message}`;
  }
  saveOrders([order, ...getOrders()].slice(0, 30));
  state.cart.clear();
  els.orderNote.value = "";
  renderCart();
  renderOrders();
  els.submitResult.className = "submit-result ok";
  els.submitResult.textContent = `${order.id}：${syncMessage}`;
}

function buildSession(table) {
  const session = crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36);
  const url = new URL(window.location.origin);
  url.searchParams.set("table", table);
  url.searchParams.set("session", session);
  return { session, url: url.toString() };
}

function showSession(table = state.table, session = state.session) {
  state.table = table;
  state.session = session;
  els.currentTable.textContent = table;
  els.tableInput.value = table;
  const url = new URL(window.location.origin);
  url.searchParams.set("table", table);
  url.searchParams.set("session", session);
  els.sessionLink.textContent = url.toString();
  els.qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url.toString())}`;
  renderSessionStatus();
}

function renderSessionStatus() {
  const closed = isSessionClosed();
  els.sessionStatus.textContent = closed ? "桌码已失效" : "桌码可用";
  els.sessionStatus.classList.toggle("closed", closed);
}

function renderOrders() {
  const orders = getOrders();
  els.ordersList.innerHTML = orders.length
    ? orders.map((order) => `
      <article class="order-card">
        <strong>${order.id} · Table ${order.table}</strong>
        <p>${new Date(order.createdAt).toLocaleString()} · ${money.format(order.total)}</p>
        <p>${order.items.map((item) => `${item.name} x${item.quantity}`).join(", ")}</p>
        ${order.note ? `<p>备注：${order.note}</p>` : ""}
      </article>`).join("")
    : `<div class="empty-state">还没有订单</div>`;
}

document.querySelectorAll(".nav-button").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
document.getElementById("refresh-menu").addEventListener("click", loadMenu);
document.getElementById("clear-cart").addEventListener("click", () => { state.cart.clear(); renderCart(); });
document.getElementById("submit-order").addEventListener("click", submitOrder);
els.categoryTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  state.category = button.dataset.category;
  renderCategories();
  renderMenu();
});
els.menuGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add]");
  if (button) addToCart(button.dataset.add);
});
els.cartItems.addEventListener("click", (event) => {
  const button = event.target.closest("[data-qty]");
  if (button) updateQuantity(button.dataset.qty, Number(button.dataset.delta));
});
document.getElementById("create-session").addEventListener("click", () => {
  const table = els.tableInput.value.trim() || "08";
  const next = buildSession(table);
  localStorage.removeItem(`ginly-session-${next.session}`);
  showSession(table, next.session);
  history.replaceState(null, "", new URL(next.url).search);
});
document.getElementById("copy-link").addEventListener("click", async () => navigator.clipboard.writeText(els.sessionLink.textContent));
document.getElementById("close-session").addEventListener("click", () => { localStorage.setItem(getSessionKey(), "closed"); renderSessionStatus(); });

showSession(state.table, state.session);
renderCart();
renderOrders();
loadMenu();
