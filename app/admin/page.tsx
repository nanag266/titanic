"use client";

import { useEffect, useMemo, useState } from "react";
import { formatGhs } from "@/lib/money";
import type { MenuItemDTO, MenuVariant } from "@/lib/types";

type AdminTab = "dashboard" | "menu" | "orders" | "settings";

type AdminConfig = {
  id: number;
  restaurantName: string;
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  phone: string;
  whatsapp: string;
  address: string;
  restaurantPlaceId: string;
  restaurantLat: number | null;
  restaurantLng: number | null;
  deliveryBaseFeePesewas: number | null;
  deliveryPerKmPesewas: number | null;
  deliveryPerMinutePesewas: number | null;
  deliveryMinimumFeePesewas: number | null;
  deliveryTrafficWeight: number;
  deliveryTrafficCap: number;
  deliverySurgeMultiplier: number;
  deliveryRoundToPesewas: number;
  maxDeliveryKm: number | null;
  serviceMinLat: number;
  serviceMaxLat: number;
  serviceMinLng: number;
  serviceMaxLng: number;
  ordersEnabled: boolean;
};

type OrderRow = {
  id: string;
  code: string;
  customerName: string;
  email: string;
  phone: string;
  deliveryAddress: string;
  distanceKm: number;
  deliveryDurationMinutes: number | null;
  deliveryPricingMultiplier: number | null;
  deliveryFeePesewas: number;
  subtotalPesewas: number;
  totalPesewas: number;
  items: Array<{ name: string; quantity: number; variantLabel?: string | null }>;
  status: string;
  paymentStatus: string;
  createdAt: string;
};

type EditVariant = { id: string; label: string; priceGhs: string };
type EditItem = {
  id?: string;
  name: string;
  category: string;
  image: string;
  description: string;
  priceGhs: string;
  variants: EditVariant[];
  available: boolean;
  featured: boolean;
  sortOrder: string;
};

const blankItem = (): EditItem => ({
  name: "",
  category: "",
  image: "/menu/page-02.webp",
  description: "",
  priceGhs: "",
  variants: [],
  available: true,
  featured: false,
  sortOrder: "0"
});

const itemToEdit = (item: MenuItemDTO): EditItem => ({
  id: item.id,
  name: item.name,
  category: item.category,
  image: item.image,
  description: item.description ?? "",
  priceGhs: item.pricePesewas === null ? "" : (item.pricePesewas / 100).toFixed(2),
  variants: (item.variants ?? []).map((variant) => ({
    id: variant.id,
    label: variant.label,
    priceGhs: variant.pricePesewas === null ? "" : (variant.pricePesewas / 100).toFixed(2)
  })),
  available: item.available,
  featured: item.featured,
  sortOrder: String(item.sortOrder)
});

const pesewasFromGhs = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : null;
};

const hasPrice = (item: MenuItemDTO) => {
  if (item.variants?.length) return item.variants.some((variant) => variant.pricePesewas !== null);
  return item.pricePesewas !== null;
};

const orderStatusClass = (status: string) => {
  if (status === "PAID") return "status-pill status-pill--paid";
  if (status === "DELIVERED") return "status-pill status-pill--delivered";
  if (status === "CANCELLED") return "status-pill status-pill--cancelled";
  return "status-pill";
};

export default function AdminPage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [menu, setMenu] = useState<MenuItemDTO[]>([]);
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [editingItem, setEditingItem] = useState<EditItem | null>(null);
  const [savingItem, setSavingItem] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [menuRes, configRes, ordersRes] = await Promise.all([
        fetch("/api/admin/menu"),
        fetch("/api/admin/config"),
        fetch("/api/admin/orders")
      ]);
      if ([menuRes, configRes, ordersRes].some((response) => response.status === 401)) {
        setAuthenticated(false);
        return;
      }
      const [menuPayload, configPayload, ordersPayload] = await Promise.all([
        menuRes.json(), configRes.json(), ordersRes.json()
      ]);
      setMenu(menuPayload.items ?? []);
      setConfig(configPayload.config ?? null);
      setOrders(ordersPayload.orders ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/admin/session")
      .then((response) => response.json())
      .then((payload) => {
        setAuthenticated(Boolean(payload.authenticated));
        if (payload.authenticated) loadAll();
      })
      .finally(() => setAuthChecking(false));
  }, []);

  const loginAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError("");
    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(login)
    });
    const payload = await response.json();
    if (!response.ok) {
      setLoginError(payload.error || "Unable to sign in.");
      return;
    }
    setAuthenticated(true);
    await loadAll();
  };

  const logout = async () => {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAuthenticated(false);
  };

  const stats = useMemo(() => {
    const priced = menu.filter(hasPrice).length;
    const pending = menu.length - priced;
    const open = orders.filter((order) => !["DELIVERED", "CANCELLED"].includes(order.status)).length;
    const revenue = orders.filter((order) => order.paymentStatus === "PAID").reduce((sum, order) => sum + order.totalPesewas, 0);
    return { priced, pending, open, revenue };
  }, [menu, orders]);

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  };

  const saveConfig = async () => {
    if (!config) return;
    setLoading(true);
    const response = await fetch("/api/admin/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config)
    });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok) {
      flash(payload.error || "Could not save settings.");
      return;
    }
    setConfig(payload.config);
    flash("Settings saved.");
  };

  const saveMenuItem = async () => {
    if (!editingItem) return;
    if (!editingItem.name.trim() || !editingItem.category.trim() || !editingItem.image.trim()) {
      flash("Name, category and image are required.");
      return;
    }
    setSavingItem(true);
    const body = {
      name: editingItem.name,
      category: editingItem.category,
      image: editingItem.image,
      description: editingItem.description,
      pricePesewas: pesewasFromGhs(editingItem.priceGhs),
      variants: editingItem.variants.length
        ? editingItem.variants.map((variant) => ({
            id: variant.id,
            label: variant.label,
            pricePesewas: pesewasFromGhs(variant.priceGhs)
          }))
        : null,
      available: editingItem.available,
      featured: editingItem.featured,
      sortOrder: Number(editingItem.sortOrder) || 0
    };
    const response = await fetch(editingItem.id ? `/api/admin/menu/${editingItem.id}` : "/api/admin/menu", {
      method: editingItem.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json();
    setSavingItem(false);
    if (!response.ok) {
      flash(payload.error || "Could not save menu item.");
      return;
    }
    setEditingItem(null);
    await loadAll();
    flash("Menu item saved.");
  };

  const deleteMenuItem = async (item: MenuItemDTO) => {
    if (!window.confirm(`Delete ${item.name}?`)) return;
    const response = await fetch(`/api/admin/menu/${item.id}`, { method: "DELETE" });
    if (response.ok) {
      setMenu((current) => current.filter((entry) => entry.id !== item.id));
      flash("Menu item deleted.");
    }
  };

  const updateOrderStatus = async (id: string, status: string) => {
    const response = await fetch(`/api/admin/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    const payload = await response.json();
    if (!response.ok) {
      flash(payload.error || "Could not update order.");
      return;
    }
    setOrders((current) => current.map((order) => order.id === id ? { ...order, status } : order));
    flash("Order status updated.");
  };

  if (authChecking) {
    return <main className="admin-login-shell"><section className="admin-login-card"><p>Loading Admin…</p></section></main>;
  }

  if (!authenticated) {
    return (
      <main className="admin-login-shell">
        <form className="admin-login-card" onSubmit={loginAdmin}>
          <img src="/brand/logo.png" alt="Titanic City Ventures" />
          <h1>Restaurant Admin</h1>
          <p>Manage menu prices, ordering, delivery settings and orders.</p>
          <div className="admin-form-stack">
            <input className="admin-input" type="email" value={login.email} onChange={(e) => setLogin({ ...login, email: e.target.value })} placeholder="Admin email" required />
            <input className="admin-input" type="password" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} placeholder="Password" required />
            {loginError ? <p className="form-error">{loginError}</p> : null}
            <button className="primary-button primary-button--wide" type="submit">Sign in</button>
          </div>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-brand"><img src="/brand/logo.png" alt="" /><strong>Titanic City<br />Admin</strong></div>
          <nav className="admin-nav">
            {(["dashboard", "menu", "orders", "settings"] as AdminTab[]).map((entry) => (
              <button className={tab === entry ? "active" : ""} type="button" key={entry} onClick={() => setTab(entry)}>
                {entry.charAt(0).toUpperCase() + entry.slice(1)}
              </button>
            ))}
          </nav>
          <div className="admin-sidebar-foot"><a href="/">View website</a><button type="button" onClick={logout}>Sign out</button></div>
        </aside>

        <section className="admin-main">
          <div className="admin-topbar">
            <div>
              <span className="eyebrow">Restaurant control centre</span>
              <h1>{tab.charAt(0).toUpperCase() + tab.slice(1)}</h1>
              <p>Changes publish through the same Render-hosted application.</p>
            </div>
            <button className="admin-button admin-button--light" type="button" onClick={loadAll}>{loading ? "Refreshing…" : "Refresh"}</button>
          </div>

          {notice ? <div className="admin-banner">{notice}</div> : null}

          {tab === "dashboard" ? (
            <>
              <div className="admin-banner">
                The PDF did not contain cedi prices. Menu items are seeded with prices intentionally blank, so customers cannot accidentally pay an invented amount. Add the official prices under Menu before launch.
              </div>
              <div className="admin-grid">
                <div className="admin-card"><span className="eyebrow">Menu</span><h2>{stats.priced}</h2><p>items with at least one live price</p></div>
                <div className="admin-card"><span className="eyebrow">Price work</span><h2>{stats.pending}</h2><p>items still waiting for cedi prices</p></div>
                <div className="admin-card"><span className="eyebrow">Orders</span><h2>{stats.open}</h2><p>open / active orders</p></div>
                <div className="admin-card"><span className="eyebrow">Paid value</span><h2>{formatGhs(stats.revenue)}</h2><p>sum of confirmed paid orders in the database</p></div>
              </div>
              <div className="admin-card">
                <div className="admin-card-head"><div><h2>Launch checklist</h2><p>Items that must be configured before taking real orders.</p></div></div>
                <div className="admin-menu-list">
                  <div className="admin-menu-row"><div className="status-pill">1</div><div><strong>Official menu prices</strong><small>{stats.pending ? `${stats.pending} items still need prices.` : "All current menu items have prices."}</small></div><div className="admin-price-chip">{stats.pending ? "Needs work" : "Ready"}</div><div /><div /></div>
                  <div className="admin-menu-row"><div className="status-pill">2</div><div><strong>Restaurant dispatch location</strong><small>Google Place ID is set; fallback coordinates are optional.</small></div><div className="admin-price-chip">{config?.restaurantPlaceId || (config?.restaurantLat !== null && config?.restaurantLng !== null) ? "Ready" : "Needs work"}</div><div /><div /></div>
                  <div className="admin-menu-row"><div className="status-pill">3</div><div><strong>Delivery rates</strong><small>Base, distance, route-time and dynamic multipliers.</small></div><div className="admin-price-chip">{config?.deliveryBaseFeePesewas !== null && config?.deliveryPerKmPesewas !== null && config?.deliveryPerMinutePesewas !== null ? "Ready" : "Needs work"}</div><div /><div /></div>
                  <div className="admin-menu-row"><div className="status-pill">4</div><div><strong>Render secrets</strong><small>Paystack, Google Maps and admin credentials are environment variables, not database fields.</small></div><div className="admin-price-chip">Render</div><div /><div /></div>
                </div>
              </div>
            </>
          ) : null}

          {tab === "menu" ? (
            <div className="admin-card">
              <div className="admin-card-head">
                <div><h2>Menu items</h2><p>Set cedi prices, variants, availability, category and imagery.</p></div>
                <button className="admin-button admin-button--orange" type="button" onClick={() => setEditingItem(blankItem())}>Add item</button>
              </div>
              <div className="admin-menu-list">
                {menu.map((item) => (
                  <div className="admin-menu-row" key={item.id}>
                    <img src={item.image} alt="" />
                    <div><strong>{item.name}</strong><small>{item.category} · {item.available ? "Visible" : "Hidden"}{item.variants?.length ? ` · ${item.variants.length} options` : ""}</small></div>
                    <div className="admin-price-chip">{item.variants?.length ? item.variants.map((variant) => `${variant.label}: ${formatGhs(variant.pricePesewas)}`).join(" · ") : formatGhs(item.pricePesewas)}</div>
                    <div><span className={hasPrice(item) ? "status-pill status-pill--paid" : "status-pill"}>{hasPrice(item) ? "Priced" : "Pending"}</span></div>
                    <div className="admin-row-actions"><button type="button" onClick={() => setEditingItem(itemToEdit(item))}>Edit</button><button type="button" onClick={() => deleteMenuItem(item)}>Delete</button></div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {tab === "orders" ? (
            <div className="admin-card">
              <div className="admin-card-head"><div><h2>Orders</h2><p>Paystack-confirmed payments and kitchen/delivery status.</p></div></div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Delivery</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
                  <tbody>
                    {orders.length ? orders.map((order) => (
                      <tr key={order.id}>
                        <td><strong>{order.code}</strong><br />{new Date(order.createdAt).toLocaleString()}</td>
                        <td><strong>{order.customerName}</strong><br />{order.phone}<br />{order.email}</td>
                        <td>{Array.isArray(order.items) ? order.items.map((item, index) => <div key={index}>{item.quantity}× {item.name}{item.variantLabel ? ` (${item.variantLabel})` : ""}</div>) : "—"}</td>
                        <td>{order.deliveryAddress}<br /><small>{order.distanceKm.toFixed(1)} km{order.deliveryDurationMinutes ? ` · ${Math.round(order.deliveryDurationMinutes)} min` : ""} · {formatGhs(order.deliveryFeePesewas)}</small></td>
                        <td><strong>{formatGhs(order.totalPesewas)}</strong></td>
                        <td><span className={order.paymentStatus === "PAID" ? "status-pill status-pill--paid" : "status-pill"}>{order.paymentStatus}</span></td>
                        <td>
                          <select className="admin-select" value={order.status} onChange={(e) => updateOrderStatus(order.id, e.target.value)}>
                            <option value="AWAITING_PAYMENT">Awaiting payment</option>
                            <option value="PAYMENT_INIT_FAILED">Payment init failed</option>
                            <option value="PAID">Paid</option>
                            <option value="PREPARING">Preparing</option>
                            <option value="OUT_FOR_DELIVERY">Out for delivery</option>
                            <option value="DELIVERED">Delivered</option>
                            <option value="CANCELLED">Cancelled</option>
                          </select>
                          <div style={{ marginTop: 6 }}><span className={orderStatusClass(order.status)}>{order.status.replaceAll("_", " ")}</span></div>
                        </td>
                      </tr>
                    )) : <tr><td colSpan={7}>No orders yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {tab === "settings" && config ? (
            <>
              <div className="admin-card">
                <div className="admin-card-head"><div><h2>Website content</h2><p>Brand copy and contact information shown to customers.</p></div></div>
                <div className="admin-grid">
                  <div className="admin-field"><label>Restaurant name</label><input className="admin-input" value={config.restaurantName} onChange={(e) => setConfig({ ...config, restaurantName: e.target.value })} /></div>
                  <div className="admin-field"><label>Tagline</label><input className="admin-input" value={config.tagline} onChange={(e) => setConfig({ ...config, tagline: e.target.value })} /></div>
                  <div className="admin-field admin-field--wide"><label>Hero headline</label><input className="admin-input" value={config.heroTitle} onChange={(e) => setConfig({ ...config, heroTitle: e.target.value })} /></div>
                  <div className="admin-field admin-field--wide"><label>Hero description</label><textarea className="admin-textarea" value={config.heroSubtitle} onChange={(e) => setConfig({ ...config, heroSubtitle: e.target.value })} /></div>
                  <div className="admin-field"><label>Phone</label><input className="admin-input" value={config.phone} onChange={(e) => setConfig({ ...config, phone: e.target.value })} /></div>
                  <div className="admin-field"><label>WhatsApp</label><input className="admin-input" value={config.whatsapp} onChange={(e) => setConfig({ ...config, whatsapp: e.target.value })} /></div>
                  <div className="admin-field admin-field--wide"><label>Restaurant address</label><input className="admin-input" value={config.address} onChange={(e) => setConfig({ ...config, address: e.target.value })} /></div>
                </div>
              </div>

              <div className="admin-card">
                <div className="admin-card-head"><div><h2>Delivery engine</h2><p>Titanic Beach dispatch origin, Bolt-style dynamic route pricing and Accra-only service boundary.</p></div></div>
                <div className="admin-banner">The restaurant origin is preconfigured from the Google Maps place for Titanic City Ventures at Titanic Beach, Tema. Delivery fees use route distance, traffic-aware travel time and an adjustable demand/weather multiplier. Bolt's exact internal coefficients are not public, so these controls reproduce the published pricing factors rather than claiming an identical Bolt fare.</div>
                <div className="admin-grid">
                  <div className="admin-field admin-field--wide"><label>Google Place ID (dispatch origin)</label><input className="admin-input" value={config.restaurantPlaceId} onChange={(e) => setConfig({ ...config, restaurantPlaceId: e.target.value })} /></div>
                  <div className="admin-field"><label>Fallback latitude</label><input className="admin-input" type="number" step="any" value={config.restaurantLat ?? ""} onChange={(e) => setConfig({ ...config, restaurantLat: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                  <div className="admin-field"><label>Fallback longitude</label><input className="admin-input" type="number" step="any" value={config.restaurantLng ?? ""} onChange={(e) => setConfig({ ...config, restaurantLng: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                  <div className="admin-field"><label>Base fee (GH₵)</label><input className="admin-input" type="number" min="0" step="0.01" value={config.deliveryBaseFeePesewas === null ? "" : config.deliveryBaseFeePesewas / 100} onChange={(e) => setConfig({ ...config, deliveryBaseFeePesewas: e.target.value === "" ? null : Math.round(Number(e.target.value) * 100) })} /></div>
                  <div className="admin-field"><label>Per km (GH₵)</label><input className="admin-input" type="number" min="0" step="0.01" value={config.deliveryPerKmPesewas === null ? "" : config.deliveryPerKmPesewas / 100} onChange={(e) => setConfig({ ...config, deliveryPerKmPesewas: e.target.value === "" ? null : Math.round(Number(e.target.value) * 100) })} /></div>
                  <div className="admin-field"><label>Per route minute (GH₵)</label><input className="admin-input" type="number" min="0" step="0.01" value={config.deliveryPerMinutePesewas === null ? "" : config.deliveryPerMinutePesewas / 100} onChange={(e) => setConfig({ ...config, deliveryPerMinutePesewas: e.target.value === "" ? null : Math.round(Number(e.target.value) * 100) })} /></div>
                  <div className="admin-field"><label>Minimum delivery fee (GH₵)</label><input className="admin-input" type="number" min="0" step="0.01" value={config.deliveryMinimumFeePesewas === null ? "" : config.deliveryMinimumFeePesewas / 100} onChange={(e) => setConfig({ ...config, deliveryMinimumFeePesewas: e.target.value === "" ? null : Math.round(Number(e.target.value) * 100) })} /></div>
                  <div className="admin-field"><label>Traffic sensitivity (0–1)</label><input className="admin-input" type="number" min="0" max="1" step="0.05" value={config.deliveryTrafficWeight} onChange={(e) => setConfig({ ...config, deliveryTrafficWeight: Number(e.target.value) })} /></div>
                  <div className="admin-field"><label>Traffic multiplier cap</label><input className="admin-input" type="number" min="1" max="3" step="0.05" value={config.deliveryTrafficCap} onChange={(e) => setConfig({ ...config, deliveryTrafficCap: Number(e.target.value) })} /></div>
                  <div className="admin-field"><label>Demand / weather multiplier</label><input className="admin-input" type="number" min="1" max="3" step="0.05" value={config.deliverySurgeMultiplier} onChange={(e) => setConfig({ ...config, deliverySurgeMultiplier: Number(e.target.value) })} /></div>
                  <div className="admin-field"><label>Round fee to (GH₵)</label><input className="admin-input" type="number" min="0.5" step="0.5" value={config.deliveryRoundToPesewas / 100} onChange={(e) => setConfig({ ...config, deliveryRoundToPesewas: Math.max(1, Math.round(Number(e.target.value) * 100)) })} /></div>
                  <div className="admin-field"><label>Max route distance (km)</label><input className="admin-input" type="number" min="1" step="0.5" value={config.maxDeliveryKm ?? ""} onChange={(e) => setConfig({ ...config, maxDeliveryKm: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                  <div className="admin-field"><label>South / min latitude</label><input className="admin-input" type="number" step="any" value={config.serviceMinLat} onChange={(e) => setConfig({ ...config, serviceMinLat: Number(e.target.value) })} /></div>
                  <div className="admin-field"><label>North / max latitude</label><input className="admin-input" type="number" step="any" value={config.serviceMaxLat} onChange={(e) => setConfig({ ...config, serviceMaxLat: Number(e.target.value) })} /></div>
                  <div className="admin-field"><label>West / min longitude</label><input className="admin-input" type="number" step="any" value={config.serviceMinLng} onChange={(e) => setConfig({ ...config, serviceMinLng: Number(e.target.value) })} /></div>
                  <div className="admin-field"><label>East / max longitude</label><input className="admin-input" type="number" step="any" value={config.serviceMaxLng} onChange={(e) => setConfig({ ...config, serviceMaxLng: Number(e.target.value) })} /></div>
                  <div className="admin-field admin-field--wide"><label>Online ordering</label><select className="admin-select" value={config.ordersEnabled ? "on" : "off"} onChange={(e) => setConfig({ ...config, ordersEnabled: e.target.value === "on" })}><option value="on">Enabled</option><option value="off">Paused</option></select></div>
                </div>
                <div className="admin-action-row"><button className="admin-button admin-button--orange" type="button" onClick={saveConfig} disabled={loading}>Save settings</button></div>
              </div>
            </>
          ) : null}
        </section>
      </div>

      {editingItem ? (
        <div className="modal-shell" role="dialog" aria-modal="true">
          <button className="modal-backdrop" type="button" aria-label="Close editor" onClick={() => setEditingItem(null)} />
          <section className="variant-modal" style={{ width: "min(720px, 100%)" }}>
            <button className="icon-button modal-close" type="button" onClick={() => setEditingItem(null)}>×</button>
            <span className="eyebrow">Menu editor</span>
            <h2>{editingItem.id ? "Edit menu item" : "Add menu item"}</h2>
            <div className="admin-grid">
              <div className="admin-field"><label>Name</label><input className="admin-input" value={editingItem.name} onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })} /></div>
              <div className="admin-field"><label>Category</label><input className="admin-input" value={editingItem.category} onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })} /></div>
              <div className="admin-field admin-field--wide"><label>Image path or URL</label><input className="admin-input" value={editingItem.image} onChange={(e) => setEditingItem({ ...editingItem, image: e.target.value })} /></div>
              <div className="admin-field admin-field--wide"><label>Description (optional)</label><textarea className="admin-textarea" value={editingItem.description} onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })} /></div>
              {!editingItem.variants.length ? <div className="admin-field"><label>Base price (GH₵)</label><input className="admin-input" type="number" min="0" step="0.01" value={editingItem.priceGhs} onChange={(e) => setEditingItem({ ...editingItem, priceGhs: e.target.value })} placeholder="Leave blank until official" /></div> : null}
              <div className="admin-field"><label>Sort order</label><input className="admin-input" type="number" value={editingItem.sortOrder} onChange={(e) => setEditingItem({ ...editingItem, sortOrder: e.target.value })} /></div>
              <div className="admin-field"><label>Visible</label><select className="admin-select" value={editingItem.available ? "yes" : "no"} onChange={(e) => setEditingItem({ ...editingItem, available: e.target.value === "yes" })}><option value="yes">Yes</option><option value="no">No</option></select></div>
              <div className="admin-field"><label>Featured</label><select className="admin-select" value={editingItem.featured ? "yes" : "no"} onChange={(e) => setEditingItem({ ...editingItem, featured: e.target.value === "yes" })}><option value="yes">Yes</option><option value="no">No</option></select></div>
              <div className="admin-field admin-field--wide">
                <label>Options / sizes</label>
                <div className="variant-editor">
                  {editingItem.variants.map((variant, index) => (
                    <div className="variant-editor-row" key={`${variant.id}-${index}`}>
                      <input className="admin-input" value={variant.label} onChange={(e) => setEditingItem({ ...editingItem, variants: editingItem.variants.map((entry, i) => i === index ? { ...entry, label: e.target.value } : entry) })} placeholder="Option label" />
                      <input className="admin-input" type="number" min="0" step="0.01" value={variant.priceGhs} onChange={(e) => setEditingItem({ ...editingItem, variants: editingItem.variants.map((entry, i) => i === index ? { ...entry, priceGhs: e.target.value } : entry) })} placeholder="GH₵" />
                      <button className="admin-button admin-button--danger" type="button" onClick={() => setEditingItem({ ...editingItem, variants: editingItem.variants.filter((_, i) => i !== index) })}>×</button>
                    </div>
                  ))}
                </div>
                <div className="admin-action-row">
                  <button className="admin-button admin-button--light" type="button" onClick={() => setEditingItem({ ...editingItem, priceGhs: "", variants: [...editingItem.variants, { id: `option-${Date.now()}`, label: "", priceGhs: "" }] })}>Add option</button>
                </div>
              </div>
            </div>
            <div className="admin-action-row">
              <button className="admin-button admin-button--orange" type="button" disabled={savingItem} onClick={saveMenuItem}>{savingItem ? "Saving…" : "Save item"}</button>
              <button className="admin-button admin-button--light" type="button" onClick={() => setEditingItem(null)}>Cancel</button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
