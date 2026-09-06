"use client";

import { useMemo, useState } from "react";
import { LocationPicker } from "@/components/LocationPicker";
import { formatGhs } from "@/lib/money";
import type { CartItem, DeliveryQuoteDTO, PublicConfig, SelectedLocation } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  config: PublicConfig | null;
  setQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
};

const readResponse = async (response: Response) => {
  const text = await response.text();
  if (!text) return {} as { error?: string; authorizationUrl?: string; quote?: DeliveryQuoteDTO };
  try {
    return JSON.parse(text) as { error?: string; authorizationUrl?: string; quote?: DeliveryQuoteDTO };
  } catch {
    return { error: `Payment request failed (${response.status}).` };
  }
};

export const CartDrawer = ({ open, onClose, cart, config, setQuantity, removeItem }: Props) => {
  const [location, setLocation] = useState<SelectedLocation | null>(null);
  const [quote, setQuote] = useState<DeliveryQuoteDTO | null>(null);
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "" });
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.unitPricePesewas * item.quantity, 0),
    [cart]
  );
  const total = subtotal + (quote?.eligible ? quote.feePesewas ?? 0 : 0);

  const selectLocation = async (selected: SelectedLocation) => {
    setLocation(selected);
    setQuote(null);
    setError("");
    setLoadingQuote(true);
    try {
      const response = await fetch("/api/delivery/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: selected.lat, lng: selected.lng })
      });
      const payload = await readResponse(response);
      if (!response.ok) throw new Error(payload.error || "Unable to calculate delivery.");
      setQuote(payload.quote ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to calculate delivery.");
    } finally {
      setLoadingQuote(false);
    }
  };

  const checkout = async () => {
    setError("");
    if (!location || !quote?.eligible) {
      setError("Choose an eligible Accra delivery location first.");
      return;
    }
    if (!customer.name.trim() || !customer.email.trim() || !customer.phone.trim()) {
      setError("Enter your name, email and phone number.");
      return;
    }
    setPaying(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer,
          delivery: location,
          items: cart.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            variantId: item.variantId
          }))
        })
      });
      const payload = await readResponse(response);
      if (!response.ok) throw new Error(payload.error || "Unable to start payment.");
      if (!payload.authorizationUrl) throw new Error("Paystack did not return a payment link.");
      window.location.href = payload.authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start payment.");
      setPaying(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={`drawer-backdrop ${open ? "drawer-backdrop--open" : ""}`}
        aria-label="Close cart"
        onClick={onClose}
      />
      <aside className={`cart-drawer ${open ? "cart-drawer--open" : ""}`} aria-hidden={!open}>
        <div className="cart-head">
          <div>
            <span className="eyebrow">Your order</span>
            <h2>Cart</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close cart">×</button>
        </div>

        <div className="cart-scroll">
          {cart.length === 0 ? (
            <div className="empty-cart">
              <div className="empty-cart-mark">TCV</div>
              <h3>Your cart is waiting.</h3>
              <p>Add a priced menu item and it will appear here.</p>
            </div>
          ) : (
            <>
              <div className="cart-items">
                {cart.map((item) => (
                  <article className="cart-line" key={item.key}>
                    <img src={item.image} alt="" />
                    <div className="cart-line-main">
                      <strong>{item.name}</strong>
                      {item.variantLabel ? <span>{item.variantLabel}</span> : null}
                      <span>{formatGhs(item.unitPricePesewas)}</span>
                      <div className="qty-row">
                        <button type="button" onClick={() => setQuantity(item.key, item.quantity - 1)}>−</button>
                        <span>{item.quantity}</span>
                        <button type="button" onClick={() => setQuantity(item.key, item.quantity + 1)}>+</button>
                        <button type="button" className="remove-link" onClick={() => removeItem(item.key)}>Remove</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <section className="checkout-section">
                <div className="section-mini-head">
                  <span>1</span>
                  <div><strong>Delivery location</strong><small>Accra only</small></div>
                </div>
                <LocationPicker config={config} value={location} onSelect={selectLocation} compact />
                {loadingQuote ? <p className="form-note">Calculating the delivery route…</p> : null}
                {quote ? (
                  <div className={`quote-box ${quote.eligible ? "quote-box--ok" : "quote-box--bad"}`}>
                    {quote.eligible ? (
                      <>
                        <strong>{formatGhs(quote.feePesewas)}</strong>
                        <span>
                          {quote.distanceKm?.toFixed(1)} km
                          {quote.durationMinutes ? ` · about ${quote.durationMinutes} min` : ""}
                          {quote.distanceSource === "google-routes" ? " · traffic-aware" : ""}
                        </span>
                      </>
                    ) : <span>{quote.reason}</span>}
                  </div>
                ) : null}
              </section>

              <section className="checkout-section">
                <div className="section-mini-head">
                  <span>2</span>
                  <div><strong>Contact details</strong><small>For your order and delivery</small></div>
                </div>
                <div className="field-grid">
                  <input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Full name" />
                  <input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="Phone number" />
                  <input className="field-wide" type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="Email address" />
                </div>
              </section>
            </>
          )}
        </div>

        <div className="cart-footer">
          {cart.length ? (
            <>
              <div className="total-row"><span>Subtotal</span><strong>{formatGhs(subtotal)}</strong></div>
              <div className="total-row"><span>Delivery</span><strong>{quote?.eligible ? formatGhs(quote.feePesewas) : "—"}</strong></div>
              <div className="total-row total-row--grand"><span>Total</span><strong>{formatGhs(total)}</strong></div>
              {error ? <p className="form-error">{error}</p> : null}
              <button
                type="button"
                className="primary-button primary-button--wide"
                disabled={paying || !quote?.eligible || !config?.ordersEnabled}
                onClick={checkout}
              >
                {paying ? "Opening Paystack…" : "Pay securely with Paystack"}
              </button>
              <p className="secure-note">Your Paystack secret key never touches the browser.</p>
            </>
          ) : null}
        </div>
      </aside>
    </>
  );
};
