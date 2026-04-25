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
  tableBillSummary: document.getElementById("table-bill-summary"),
  orderNote: document.getElementById("order-note"),
  submitResult: document.getElementById("submit-result"),
  tableInput: document.getElementById("table-input"),
  qrImage: document.getElementById("qr-image"),
  sessionLink: document.getElementById("session-link"),
  ordersList: document.getElementById("orders-list"),
};

const money = new Intl.NumberFormat("en-TH", { style: "currency", currency: "THB" });
const getSessionKey = () => `ginly-session-${state.session}`;
const getBillKey = () => `ginly-bill-${state.session}`;
const isSessionClosed = () => localStorage.getItem(getSessionKey()) === "closed";

function getCurrentBill() {
  return JSON.parse(localStorage.getItem(getBillKey()) || JSON.stringify({
    id: `TABLE-${state.table}-${state.session}`,
    table: state.table,
    session: state.session,
    batches: [],
    items: [],
    total: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

function saveCurrentBill(bill) {
  bill.updatedAt = new Date().toISOString();
  bill.total = bill.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  localStorage.setItem(getBillKey(), JSON.stringify(bill));
}

function setView(view) {
  document.querySelectorAll(".nav-button").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  document.querySelectorAll(".app-view").forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === view));
  renderTableBill();
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
    showMessage("这个桌码已经失效，请联系店员重新开桌。", "error");
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
  renderTableBill();
}

function appendCartToTableBill() {
  const { lines, quantity, total } = getCartSummary();
  if (!quantity) return;
  if (isSessionClosed()) {
    showMessage("这个桌码已经失效，请联系店员重新开桌。", "error");
    return;
  }

  const bill = getCurrentBill();
  const batch = {
    id: `ADD-${Date.now().toString().slice(-6)}`,
    createdAt: new Date().toISOString(),
    note: els.orderNote.value.trim(),
    items: lines.map(({ item, quantity: qty }) => ({
      id: item.id,
      variantId: item.variantId,
      name: item.name,
      quantity: qty,
      price: item.price || 0,
    })),
    total,
  };

  batch.items.forEach((item) => {
    const existing = bill.items.find((entry) => entry.variantId === item.variantId && entry.price === item.price);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      bill.items.push({ ...item });
    }
  });
  bill.batches.push(batch);
  saveCurrentBill(bill);

  state.cart.clear();
  els.orderNote.value = "";
  renderCart();
  renderTableBill();
  showMessage(`${batch.id} 已加入桌号 ${state.table} 的账单，当前合计 ${money.format(bill.total)}。`, "ok");
}

function showMessage(message, type = "") {
  els.submitResult.className = `submit-result ${type}`.trim();
  els.submitResult.textContent = message;
}

function renderTableBill() {
  const bill = getCurrentBill();
  const quantity = bill.items.reduce((sum, item) => sum + item.quantity, 0);
  els.tableBillSummary.innerHTML = quantity
    ? `<strong>本桌已点 ${quantity} 件</strong><span>${money.format(bill.total)}</span>`
    : `<strong>本桌还没有已提交菜品</strong><span>${money.format(0)}</span>`;

  els.ordersList.innerHTML = quantity
    ? `
      <article class="order-card bill-total-card">
        <strong>Table ${bill.table} · 本桌汇总</strong>
        <p>${quantity} 件菜品 · ${money.format(bill.total)}</p>
        <p>${bill.items.map((item) => `${item.name} x${item.quantity}`).join(", ")}</p>
      </article>
      ${bill.batches.map((batch) => `
        <article class="order-card">
          <strong>${batch.id} · 加菜</strong>
          <p>${new Date(batch.createdAt).toLocaleString()} · ${money.format(batch.total)}</p>
          <p>${batch.items.map((item) => `${item.name} x${item.quantity}`).join(", ")}</p>
          ${batch.note ? `<p>备注：${batch.note}</p>` : ""}
        </article>`).join("")}`
    : `<div class="empty-state">这桌还没有已提交菜品</div>`;
}

async function checkoutTable() {
  const bill = getCurrentBill();
  if (!bill.items.length) {
    showMessage("这桌还没有可以结账的菜品。", "error");
    return;
  }

  showMessage("正在把本桌汇总账单同步到 Loyverse...", "");
  const checkoutOrder = {
    id: `GQO-${Date.now().toString().slice(-6)}`,
    table: bill.table,
    session: bill.session,
    note: `Ginly QR Order table ${bill.table} checkout`,
    total: bill.total,
    createdAt: new Date().toISOString(),
    items: bill.items,
  };

  try {
    const response = await fetch("/api/loyverse/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(checkoutOrder),
    });
    const payload = await response.json();
    if (!payload.synced) throw new Error(payload.error || "Loyverse sync failed");

    localStorage.setItem(getSessionKey(), "closed");
    localStorage.removeItem(getBillKey());
    renderSessionStatus();
    renderTableBill();
    showMessage(`本桌已结账并同步 Loyverse，编号 ${payload.receiptNumber || payload.receiptId || checkoutOrder.id}。`, "ok");
  } catch (error) {
    showMessage(`结账失败：${error.message}`, "error");
  }
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
  renderTableBill();
}

function renderSessionStatus() {
  const closed = isSessionClosed();
  els.sessionStatus.textContent = closed ? "桌码已失效" : "桌码可用";
  els.sessionStatus.classList.toggle("closed", closed);
}

document.querySelectorAll(".nav-button").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
document.getElementById("refresh-menu").addEventListener("click", loadMenu);
document.getElementById("clear-cart").addEventListener("click", () => { state.cart.clear(); renderCart(); });
document.getElementById("submit-order").addEventListener("click", appendCartToTableBill);
document.getElementById("checkout-table").addEventListener("click", checkoutTable);
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
renderTableBill();
loadMenu();
