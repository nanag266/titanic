"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CartDrawer } from "@/components/CartDrawer";
import { LocationPicker } from "@/components/LocationPicker";
import { formatGhs } from "@/lib/money";
import type {
  CartItem,
  DeliveryQuoteDTO,
  MenuItemDTO,
  MenuVariant,
  PublicConfig,
  SelectedLocation
} from "@/lib/types";

const priceLabel = (item: MenuItemDTO) => {
  if (Array.isArray(item.variants) && item.variants.length) {
    const priced = item.variants.filter((variant) => typeof variant.pricePesewas === "number");
    if (!priced.length) return "Price pending";
    const lowest = Math.min(...priced.map((variant) => variant.pricePesewas as number));
    return `From ${formatGhs(lowest)}`;
  }
  return item.pricePesewas === null ? "Price pending" : formatGhs(item.pricePesewas);
};

const hasLivePrice = (item: MenuItemDTO) => {
  if (Array.isArray(item.variants) && item.variants.length) {
    return item.variants.some((variant) => typeof variant.pricePesewas === "number");
  }
  return typeof item.pricePesewas === "number";
};

export default function HomePage() {
  const [menu, setMenu] = useState<MenuItemDTO[]>([]);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [variantItem, setVariantItem] = useState<MenuItemDTO | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<MenuVariant | null>(null);
  const [deliveryLocation, setDeliveryLocation] = useState<SelectedLocation | null>(null);
  const [deliveryQuote, setDeliveryQuote] = useState<DeliveryQuoteDTO | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/menu").then((response) => response.json()),
      fetch("/api/config").then((response) => response.json())
    ])
      .then(([menuPayload, configPayload]) => {
        setMenu(menuPayload.items ?? []);
        setConfig(configPayload.config ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("tcv-cart");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as CartItem[];
      if (Array.isArray(parsed)) setCart(parsed);
    } catch {
      localStorage.removeItem("tcv-cart");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("tcv-cart", JSON.stringify(cart));
  }, [cart]);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(menu.map((item) => item.category)))],
    [menu]
  );

  const visibleMenu = useMemo(() => {
    const query = search.trim().toLowerCase();
    return menu.filter((item) => {
      const inCategory = activeCategory === "All" || item.category === activeCategory;
      const matchesSearch = !query || `${item.name} ${item.category}`.toLowerCase().includes(query);
      return inCategory && matchesSearch;
    });
  }, [menu, activeCategory, search]);

  const featured = menu.filter((item) => item.featured).slice(0, 6);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addToCart = useCallback((item: MenuItemDTO, variant: MenuVariant | null = null) => {
    const unitPricePesewas = variant?.pricePesewas ?? item.pricePesewas;
    if (typeof unitPricePesewas !== "number") return;
    const key = `${item.id}:${variant?.id ?? "base"}`;
    setCart((current) => {
      const existing = current.find((entry) => entry.key === key);
      if (existing) {
        return current.map((entry) =>
          entry.key === key ? { ...entry, quantity: Math.min(20, entry.quantity + 1) } : entry
        );
      }
      return [
        ...current,
        {
          key,
          menuItemId: item.id,
          name: item.name,
          image: item.image,
          variantId: variant?.id ?? null,
          variantLabel: variant?.label ?? null,
          unitPricePesewas,
          quantity: 1
        }
      ];
    });
    setVariantItem(null);
    setSelectedVariant(null);
    setCartOpen(true);
  }, []);

  const chooseItem = (item: MenuItemDTO) => {
    if (!hasLivePrice(item)) return;
    if (Array.isArray(item.variants) && item.variants.length) {
      setVariantItem(item);
      setSelectedVariant(item.variants.find((variant) => typeof variant.pricePesewas === "number") ?? null);
      return;
    }
    addToCart(item);
  };

  const setQuantity = (key: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((current) => current.filter((item) => item.key !== key));
      return;
    }
    setCart((current) => current.map((item) => item.key === key ? { ...item, quantity: Math.min(20, quantity) } : item));
  };

  const removeItem = (key: string) => setCart((current) => current.filter((item) => item.key !== key));

  const quoteLocation = async (location: SelectedLocation) => {
    setDeliveryLocation(location);
    setDeliveryQuote(null);
    setQuoteLoading(true);
    try {
      const response = await fetch("/api/delivery/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: location.lat, lng: location.lng })
      });
      const payload = await response.json();
      setDeliveryQuote(payload.quote ?? { configured: false, eligible: false, reason: payload.error });
    } catch {
      setDeliveryQuote({ configured: false, eligible: false, reason: "Delivery quote is unavailable right now." });
    } finally {
      setQuoteLoading(false);
    }
  };

  return (
    <main>
      <header className="site-header">
        <a href="#top" className="brand-lockup" aria-label="Titanic City Ventures home">
          <img src="/brand/logo.png" alt="Titanic City Ventures" />
          <span>
            <strong>Titanic City</strong>
            <small>Ventures</small>
          </span>
        </a>
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#menu">Menu</a>
          <a href="#delivery">Delivery</a>
          <a href="#about">About</a>
        </nav>
        <button className="cart-button" type="button" onClick={() => setCartOpen(true)}>
          <span>Cart</span>
          <b>{cartCount}</b>
        </button>
      </header>

      <section className="hero" id="top">
        <div className="hero-orb hero-orb--one" />
        <div className="hero-orb hero-orb--two" />
        <div className="hero-copy">
          <span className="hero-kicker"><i /> Accra delivery · Paystack checkout</span>
          <h1>{config?.heroTitle ?? "Accra's table, turned all the way up."}</h1>
          <p>{config?.heroSubtitle ?? "Bold Ghanaian favourites, grills, rice dishes and more — ready for online ordering."}</p>
          <div className="hero-actions">
            <a href="#menu" className="primary-button">See the menu</a>
            <a href="#delivery" className="secondary-button">Check delivery</a>
          </div>
          <div className="hero-facts">
            <div><strong>Accra</strong><span>Delivery area</span></div>
            <div><strong>Live</strong><span>Menu control</span></div>
            <div><strong>Secure</strong><span>Paystack payments</span></div>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-photo">
            <img src="/brand/hero-food.webp" alt="" />
          </div>
          <div className="hero-card hero-card--top">
            <span>Tonight's mood</span>
            <strong>Hot. Fresh. Titanic.</strong>
          </div>
          <div className="hero-card hero-card--bottom">
            <span className="pulse-dot" />
            <div><strong>Online ordering</strong><small>{config?.ordersEnabled ? (menu.some(hasLivePrice) ? "Ready to order" : "Menu prices being updated") : "Temporarily paused"}</small></div>
          </div>
        </div>
      </section>

      <section className="ticker" aria-label="Highlights">
        <div className="ticker-track">
          <span>GRILLS</span><i>◆</i><span>JOLLOF</span><i>◆</i><span>SEAFOOD</span><i>◆</i><span>LOCAL FAVOURITES</span><i>◆</i><span>FRIED RICE</span><i>◆</i><span>LIGHT SOUP</span><i>◆</i>
          <span>GRILLS</span><i>◆</i><span>JOLLOF</span><i>◆</i><span>SEAFOOD</span><i>◆</i><span>LOCAL FAVOURITES</span><i>◆</i><span>FRIED RICE</span><i>◆</i><span>LIGHT SOUP</span><i>◆</i>
        </div>
      </section>

      {featured.length ? (
        <section className="featured-strip">
          <div className="section-heading section-heading--light">
            <span className="eyebrow">Popular picks</span>
            <h2>Start here.</h2>
          </div>
          <div className="featured-row">
            {featured.map((item) => (
              <button className="featured-card" type="button" key={item.id} onClick={() => chooseItem(item)}>
                <img src={item.image} alt="" />
                <div className="featured-overlay" />
                <div className="featured-copy">
                  <small>{item.category}</small>
                  <strong>{item.name}</strong>
                  <span>{priceLabel(item)}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="menu-section" id="menu">
        <div className="menu-intro">
          <div className="section-heading">
            <span className="eyebrow">The full menu</span>
            <h2>Find your next plate.</h2>
            <p>Explore grills, rice dishes, seafood, starters and local favourites. Items become orderable as soon as their official cedi prices are live.</p>
          </div>
          <div className="menu-search-wrap">
            <span aria-hidden="true">⌕</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the menu" aria-label="Search menu" />
          </div>
        </div>

        <div className="category-tabs" role="tablist" aria-label="Menu categories">
          {categories.map((category) => (
            <button
              type="button"
              key={category}
              className={activeCategory === category ? "active" : ""}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="menu-grid">
            {Array.from({ length: 8 }).map((_, index) => <div className="menu-skeleton" key={index} />)}
          </div>
        ) : (
          <div className="menu-grid">
            {visibleMenu.map((item, index) => {
              const live = hasLivePrice(item);
              return (
                <article className={`menu-card ${index % 5 === 0 ? "menu-card--tall" : ""}`} key={item.id}>
                  <div className="menu-card-photo">
                    <img src={item.image} alt={item.name} />
                    <span className={`availability-badge ${live ? "availability-badge--live" : ""}`}>
                      {live ? "Order now" : "Price pending"}
                    </span>
                  </div>
                  <div className="menu-card-body">
                    <div>
                      <small>{item.category}</small>
                      <h3>{item.name}</h3>
                    </div>
                    <div className="menu-card-bottom">
                      <strong>{priceLabel(item)}</strong>
                      <button type="button" disabled={!live} onClick={() => chooseItem(item)} aria-label={`Add ${item.name} to cart`}>
                        {live ? "+" : "—"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && !visibleMenu.length ? (
          <div className="no-results"><strong>No menu match.</strong><span>Try another search or category.</span></div>
        ) : null}
      </section>

      <section className="delivery-section" id="delivery">
        <div className="delivery-copy">
          <span className="eyebrow eyebrow--orange">Accra delivery</span>
          <h2>Search your location. See the fee before checkout.</h2>
          <p>The delivery engine checks the restaurant's Accra service area, calculates the route distance and applies the delivery rate you set in Admin.</p>
          <div className="delivery-points">
            <div><span>01</span><p><strong>Search</strong> an address or landmark like you would in a ride-hailing app.</p></div>
            <div><span>02</span><p><strong>Validate</strong> that the drop-off is inside the configured Accra delivery area.</p></div>
            <div><span>03</span><p><strong>Price</strong> the trip from the restaurant dispatch point.</p></div>
          </div>
        </div>
        <div className="delivery-panel">
          <span className="panel-label">Delivery estimator</span>
          <h3>Where are we bringing it?</h3>
          <LocationPicker config={config} value={deliveryLocation} onSelect={quoteLocation} />
          <div className="delivery-result">
            {quoteLoading ? (
              <div className="result-loading"><span /><p>Calculating route and fee…</p></div>
            ) : deliveryQuote ? (
              deliveryQuote.eligible ? (
                <>
                  <div><small>Estimated fee</small><strong>{formatGhs(deliveryQuote.feePesewas)}</strong></div>
                  <div><small>Distance</small><strong>{deliveryQuote.distanceKm?.toFixed(1)} km</strong></div>
                  <p>Final delivery charge is re-calculated by the server at checkout.</p>
                </>
              ) : (
                <div className="delivery-unavailable"><strong>Not available yet</strong><p>{deliveryQuote.reason}</p></div>
              )
            ) : (
              <div className="delivery-placeholder"><span>TCV</span><p>Choose a location to calculate delivery.</p></div>
            )}
          </div>
          {!config?.deliveryReady ? <p className="setup-note">Admin setup needed: add the restaurant dispatch location and delivery rates before launch.</p> : null}
        </div>
      </section>

      <section className="about-section" id="about">
        <div className="about-logo"><img src="/brand/logo.png" alt="Titanic City Ventures logo" /></div>
        <div className="about-copy">
          <span className="eyebrow">Titanic City Ventures</span>
          <h2>{config?.tagline || "A Place to Be!"}</h2>
          <p>Bold local favourites, grills, seafood and rice dishes in one fast online ordering experience, with location-based delivery pricing across the restaurant’s Accra service area.</p>
          <div className="about-links">
            {config?.phone ? <a href={`tel:${config.phone}`}>Call {config.phone}</a> : null}
            {config?.address ? <span>{config.address}</span> : null}
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div><img src="/brand/logo.png" alt="" /><span>© {new Date().getFullYear()} Titanic City Ventures</span></div>
        <div><span>Accra delivery only</span><a href="/admin">Admin</a></div>
      </footer>

      {variantItem ? (
        <div className="modal-shell" role="dialog" aria-modal="true" aria-labelledby="variant-title">
          <button className="modal-backdrop" type="button" aria-label="Close" onClick={() => setVariantItem(null)} />
          <div className="variant-modal">
            <button className="icon-button modal-close" type="button" onClick={() => setVariantItem(null)}>×</button>
            <img src={variantItem.image} alt="" />
            <span className="eyebrow">Choose your option</span>
            <h2 id="variant-title">{variantItem.name}</h2>
            <div className="variant-list">
              {(variantItem.variants ?? []).map((variant) => {
                const priced = typeof variant.pricePesewas === "number";
                return (
                  <button
                    type="button"
                    className={selectedVariant?.id === variant.id ? "selected" : ""}
                    key={variant.id}
                    disabled={!priced}
                    onClick={() => setSelectedVariant(variant)}
                  >
                    <span>{variant.label}</span><strong>{priced ? formatGhs(variant.pricePesewas) : "Price pending"}</strong>
                  </button>
                );
              })}
            </div>
            <button className="primary-button primary-button--wide" type="button" disabled={!selectedVariant || selectedVariant.pricePesewas === null} onClick={() => selectedVariant && addToCart(variantItem, selectedVariant)}>
              Add to cart
            </button>
          </div>
        </div>
      ) : null}

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        config={config}
        setQuantity={setQuantity}
        removeItem={removeItem}
      />
    </main>
  );
}
