export type MenuVariant = {
  id: string;
  label: string;
  pricePesewas: number | null;
};

export type MenuItemDTO = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  image: string;
  pricePesewas: number | null;
  variants: MenuVariant[] | null;
  available: boolean;
  featured: boolean;
  sortOrder: number;
};

export type PublicConfig = {
  restaurantName: string;
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  phone: string;
  whatsapp: string;
  address: string;
  ordersEnabled: boolean;
  deliveryReady: boolean;
  serviceBounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
};

export type SelectedLocation = {
  address: string;
  lat: number;
  lng: number;
};

export type DeliveryQuoteDTO = {
  configured: boolean;
  eligible: boolean;
  reason?: string;
  distanceKm?: number;
  durationMinutes?: number;
  feePesewas?: number;
  trafficMultiplier?: number;
  surgeMultiplier?: number;
  pricingMultiplier?: number;
  distanceSource?: "google-routes" | "straight-line-estimate";
  pricingModel?: "bolt-style-dynamic";
};

export type CartItem = {
  key: string;
  menuItemId: string;
  name: string;
  image: string;
  variantId: string | null;
  variantLabel: string | null;
  unitPricePesewas: number;
  quantity: number;
};
