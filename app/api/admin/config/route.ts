import { isAdminRequest } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const unauthorized = () => Response.json({ error: "Unauthorized" }, { status: 401 });
const text = (value: unknown, max = 500) => typeof value === "string" ? value.trim().slice(0, max) : undefined;
const finite = (value: unknown) => {
  if (value === null || value === "" || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const integer = (value: unknown) => {
  const parsed = finite(value);
  return parsed === null ? null : Math.round(parsed);
};

export const GET = async () => {
  if (!(await isAdminRequest())) return unauthorized();
  const config = await db.siteConfig.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  return Response.json({ config });
};

export const PUT = async (request: Request) => {
  if (!(await isAdminRequest())) return unauthorized();
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "Invalid request." }, { status: 400 });

  const data = {
    restaurantName: text(body.restaurantName, 120),
    tagline: text(body.tagline, 160),
    heroTitle: text(body.heroTitle, 180),
    heroSubtitle: text(body.heroSubtitle, 400),
    phone: text(body.phone, 50),
    whatsapp: text(body.whatsapp, 50),
    address: text(body.address, 250),
    restaurantPlaceId: text(body.restaurantPlaceId, 200),
    restaurantLat: finite(body.restaurantLat),
    restaurantLng: finite(body.restaurantLng),
    deliveryBaseFeePesewas: integer(body.deliveryBaseFeePesewas),
    deliveryPerKmPesewas: integer(body.deliveryPerKmPesewas),
    deliveryPerMinutePesewas: integer(body.deliveryPerMinutePesewas),
    deliveryMinimumFeePesewas: integer(body.deliveryMinimumFeePesewas),
    deliveryTrafficWeight: finite(body.deliveryTrafficWeight) ?? 0.6,
    deliveryTrafficCap: finite(body.deliveryTrafficCap) ?? 1.25,
    deliverySurgeMultiplier: finite(body.deliverySurgeMultiplier) ?? 1,
    deliveryRoundToPesewas: integer(body.deliveryRoundToPesewas) ?? 100,
    maxDeliveryKm: finite(body.maxDeliveryKm),
    serviceMinLat: finite(body.serviceMinLat) ?? 5.45,
    serviceMaxLat: finite(body.serviceMaxLat) ?? 5.75,
    serviceMinLng: finite(body.serviceMinLng) ?? -0.35,
    serviceMaxLng: finite(body.serviceMaxLng) ?? -0.05,
    ordersEnabled: typeof body.ordersEnabled === "boolean" ? body.ordersEnabled : undefined
  };

  const config = await db.siteConfig.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data }
  });
  return Response.json({ config });
};
