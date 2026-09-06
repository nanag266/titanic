import { db } from "@/lib/db";
import { getDeliveryQuote } from "@/lib/delivery";

export const dynamic = "force-dynamic";

export const POST = async (request: Request) => {
  const body = await request.json().catch(() => null) as { lat?: unknown; lng?: unknown } | null;
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Response.json({ error: "A valid delivery location is required." }, { status: 400 });
  }

  const config = await db.siteConfig.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 }
  });
  const quote = await getDeliveryQuote(config, { lat, lng });
  return Response.json({ quote });
};
