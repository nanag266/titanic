import type { SiteConfig } from "@/lib/db";

export type DeliveryPoint = { lat: number; lng: number };

export type DeliveryQuote = {
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

type RouteMetrics = {
  distanceKm: number;
  durationMinutes: number;
  staticDurationMinutes: number;
};

const toRadians = (value: number) => (value * Math.PI) / 180;

const haversineKm = (a: DeliveryPoint, b: DeliveryPoint): number => {
  const radiusKm = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radiusKm * Math.asin(Math.sqrt(h));
};

const withinServiceBounds = (config: SiteConfig, point: DeliveryPoint) =>
  point.lat >= config.serviceMinLat &&
  point.lat <= config.serviceMaxLat &&
  point.lng >= config.serviceMinLng &&
  point.lng <= config.serviceMaxLng;

const parseDurationMinutes = (duration?: string): number | null => {
  if (!duration || !duration.endsWith("s")) return null;
  const seconds = Number(duration.slice(0, -1));
  return Number.isFinite(seconds) ? seconds / 60 : null;
};

const routeMetrics = async (config: SiteConfig, destination: DeliveryPoint): Promise<RouteMetrics | null> => {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!apiKey) return null;

  const origin = config.restaurantPlaceId.trim()
    ? { placeId: config.restaurantPlaceId.trim() }
    : config.restaurantLat !== null && config.restaurantLng !== null
      ? { location: { latLng: { latitude: config.restaurantLat, longitude: config.restaurantLng } } }
      : null;

  if (!origin) return null;

  const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.staticDuration"
    },
    body: JSON.stringify({
      origin,
      destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE"
    }),
    cache: "no-store"
  });

  if (!response.ok) return null;
  const payload = (await response.json()) as {
    routes?: Array<{ distanceMeters?: number; duration?: string; staticDuration?: string }>;
  };
  const route = payload.routes?.[0];
  const durationMinutes = parseDurationMinutes(route?.duration);
  const staticDurationMinutes = parseDurationMinutes(route?.staticDuration);
  if (typeof route?.distanceMeters !== "number" || durationMinutes === null || staticDurationMinutes === null) {
    return null;
  }

  return {
    distanceKm: route.distanceMeters / 1000,
    durationMinutes,
    staticDurationMinutes
  };
};

const roundUp = (value: number, increment: number) => {
  const safeIncrement = Math.max(1, Math.round(increment));
  return Math.ceil(value / safeIncrement) * safeIncrement;
};

export const getDeliveryQuote = async (
  config: SiteConfig,
  destination: DeliveryPoint
): Promise<DeliveryQuote> => {
  const hasOrigin =
    Boolean(config.restaurantPlaceId.trim()) ||
    (config.restaurantLat !== null && config.restaurantLng !== null);

  if (
    !hasOrigin ||
    config.deliveryBaseFeePesewas === null ||
    config.deliveryPerKmPesewas === null ||
    config.deliveryPerMinutePesewas === null
  ) {
    return {
      configured: false,
      eligible: false,
      reason: "Delivery pricing and restaurant dispatch location are not configured yet."
    };
  }

  if (!withinServiceBounds(config, destination)) {
    return {
      configured: true,
      eligible: false,
      reason: "This location is outside Titanic City Ventures' Accra delivery area."
    };
  }

  const googleMetrics = await routeMetrics(config, destination);
  if (googleMetrics === null && process.env.NODE_ENV === "production") {
    return {
      configured: false,
      eligible: false,
      reason: "Traffic-aware route pricing is temporarily unavailable. Please try again shortly."
    };
  }

  let distanceKm: number;
  let durationMinutes: number;
  let staticDurationMinutes: number;
  let distanceSource: DeliveryQuote["distanceSource"];

  if (googleMetrics) {
    ({ distanceKm, durationMinutes, staticDurationMinutes } = googleMetrics);
    distanceSource = "google-routes";
  } else if (config.restaurantLat !== null && config.restaurantLng !== null) {
    const origin = { lat: config.restaurantLat, lng: config.restaurantLng };
    distanceKm = haversineKm(origin, destination) * 1.25;
    durationMinutes = (distanceKm / 25) * 60;
    staticDurationMinutes = durationMinutes;
    distanceSource = "straight-line-estimate";
  } else {
    return {
      configured: false,
      eligible: false,
      reason: "Google route pricing is not available and no fallback dispatch coordinates are configured."
    };
  }

  if (config.maxDeliveryKm !== null && distanceKm > config.maxDeliveryKm) {
    return {
      configured: true,
      eligible: false,
      reason: `This address is more than ${config.maxDeliveryKm.toFixed(0)} km from the dispatch point.`
    };
  }

  const trafficRatio = staticDurationMinutes > 0
    ? Math.max(1, durationMinutes / staticDurationMinutes)
    : 1;
  const trafficMultiplier = Math.min(
    Math.max(1, config.deliveryTrafficCap),
    1 + (trafficRatio - 1) * Math.max(0, config.deliveryTrafficWeight)
  );
  const surgeMultiplier = Math.max(1, config.deliverySurgeMultiplier);
  const pricingMultiplier = trafficMultiplier * surgeMultiplier;

  const rawFee =
    config.deliveryBaseFeePesewas +
    Math.round(distanceKm * config.deliveryPerKmPesewas) +
    Math.round(durationMinutes * config.deliveryPerMinutePesewas);

  const roundedFee = roundUp(rawFee * pricingMultiplier, config.deliveryRoundToPesewas);
  const feePesewas = Math.max(config.deliveryMinimumFeePesewas ?? 0, roundedFee);

  return {
    configured: true,
    eligible: true,
    distanceKm: Math.round(distanceKm * 10) / 10,
    durationMinutes: Math.round(durationMinutes),
    feePesewas,
    trafficMultiplier: Math.round(trafficMultiplier * 100) / 100,
    surgeMultiplier: Math.round(surgeMultiplier * 100) / 100,
    pricingMultiplier: Math.round(pricingMultiplier * 100) / 100,
    distanceSource,
    pricingModel: "bolt-style-dynamic"
  };
};
