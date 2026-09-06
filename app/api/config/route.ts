import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const GET = async () => {
  const config = await db.siteConfig.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 }
  });

  const deliveryReady =
    (Boolean(config.restaurantPlaceId.trim()) ||
      (config.restaurantLat !== null && config.restaurantLng !== null)) &&
    config.deliveryBaseFeePesewas !== null &&
    config.deliveryPerKmPesewas !== null &&
    config.deliveryPerMinutePesewas !== null;

  return Response.json({
    config: {
      restaurantName: config.restaurantName,
      tagline: config.tagline,
      heroTitle: config.heroTitle,
      heroSubtitle: config.heroSubtitle,
      phone: config.phone,
      whatsapp: config.whatsapp,
      address: config.address,
      ordersEnabled: config.ordersEnabled,
      deliveryReady,
      serviceBounds: {
        minLat: config.serviceMinLat,
        maxLat: config.serviceMaxLat,
        minLng: config.serviceMinLng,
        maxLng: config.serviceMaxLng
      }
    }
  });
};
