import { db } from "@/lib/db";
import { getDeliveryQuote } from "@/lib/delivery";
import { makeOrderCode, makePaystackReference } from "@/lib/order";
import { initializePaystackTransaction } from "@/lib/paystack";

type CheckoutItem = {
  menuItemId?: unknown;
  quantity?: unknown;
  variantId?: unknown;
};

type CheckoutPayload = {
  customer?: { name?: unknown; email?: unknown; phone?: unknown };
  delivery?: { address?: unknown; lat?: unknown; lng?: unknown };
  items?: CheckoutItem[];
};

type Variant = { id: string; label: string; pricePesewas: number | null };

const asString = (value: unknown, max = 200) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const POST = async (request: Request) => {
  const body = (await request.json().catch(() => null)) as CheckoutPayload | null;
  if (!body) return Response.json({ error: "Invalid checkout request." }, { status: 400 });

  const name = asString(body.customer?.name, 120);
  const email = asString(body.customer?.email, 160).toLowerCase();
  const phone = asString(body.customer?.phone, 40);
  const address = asString(body.delivery?.address, 300);
  const lat = Number(body.delivery?.lat);
  const lng = Number(body.delivery?.lng);
  const requestedItems = Array.isArray(body.items) ? body.items.slice(0, 50) : [];

  if (!name || !isEmail(email) || !phone || !address || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Response.json(
      { error: "Name, email, phone number and a valid delivery location are required." },
      { status: 400 }
    );
  }
  if (requestedItems.length === 0) {
    return Response.json({ error: "Your cart is empty." }, { status: 400 });
  }

  const config = await db.siteConfig.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 }
  });
  if (!config.ordersEnabled) {
    return Response.json({ error: "Online ordering is temporarily unavailable." }, { status: 503 });
  }

  const ids = [...new Set(requestedItems.map((item) => asString(item.menuItemId, 80)).filter(Boolean))];
  const menuItems = await db.menuItem.findMany({ where: { id: { in: ids }, available: true } });
  const byId = new Map(menuItems.map((item) => [item.id, item]));

  let subtotalPesewas = 0;
  const normalizedItems: Array<{
    menuItemId: string;
    name: string;
    quantity: number;
    variantId: string | null;
    variantLabel: string | null;
    unitPricePesewas: number;
    lineTotalPesewas: number;
    image: string;
  }> = [];

  for (const requested of requestedItems) {
    const menuItemId = asString(requested.menuItemId, 80);
    const quantity = Math.max(1, Math.min(20, Math.floor(Number(requested.quantity) || 1)));
    const variantId = asString(requested.variantId, 80);
    const menuItem = byId.get(menuItemId);
    if (!menuItem) {
      return Response.json({ error: "One of the selected menu items is no longer available." }, { status: 409 });
    }

    let unitPricePesewas = menuItem.pricePesewas;
    let variantLabel: string | null = null;
    let normalizedVariantId: string | null = null;

    if (Array.isArray(menuItem.variants) && menuItem.variants.length > 0) {
      const variants = menuItem.variants as Variant[];
      const variant = variants.find((entry) => entry.id === variantId);
      if (!variant) {
        return Response.json({ error: `Choose an option for ${menuItem.name}.` }, { status: 400 });
      }
      unitPricePesewas = variant.pricePesewas;
      variantLabel = variant.label;
      normalizedVariantId = variant.id;
    }

    if (typeof unitPricePesewas !== "number") {
      return Response.json({ error: `${menuItem.name} does not have a live price yet.` }, { status: 409 });
    }

    const lineTotalPesewas = unitPricePesewas * quantity;
    subtotalPesewas += lineTotalPesewas;
    normalizedItems.push({
      menuItemId: menuItem.id,
      name: menuItem.name,
      quantity,
      variantId: normalizedVariantId,
      variantLabel,
      unitPricePesewas,
      lineTotalPesewas,
      image: menuItem.image
    });
  }

  const quote = await getDeliveryQuote(config, { lat, lng });
  if (!quote.configured || !quote.eligible || quote.feePesewas === undefined || quote.distanceKm === undefined) {
    return Response.json({ error: quote.reason ?? "Delivery is not available for this address." }, { status: 400 });
  }

  const deliveryFeePesewas = quote.feePesewas;
  const totalPesewas = subtotalPesewas + deliveryFeePesewas;
  const orderCode = makeOrderCode();
  const reference = makePaystackReference();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  const order = await db.order.create({
    data: {
      code: orderCode,
      customerName: name,
      email,
      phone,
      deliveryAddress: address,
      deliveryLat: lat,
      deliveryLng: lng,
      distanceKm: quote.distanceKm,
      deliveryDurationMinutes: quote.durationMinutes ?? null,
      deliveryPricingMultiplier: quote.pricingMultiplier ?? null,
      deliveryFeePesewas,
      subtotalPesewas,
      totalPesewas,
      items: normalizedItems,
      paystackReference: reference
    }
  });

  try {
    const payment = await initializePaystackTransaction({
      email,
      amountPesewas: totalPesewas,
      reference,
      callbackUrl: `${siteUrl.replace(/\/$/, "")}/payment/callback`,
      orderCode
    });

    return Response.json({
      orderCode: order.code,
      reference,
      authorizationUrl: payment.authorization_url
    });
  } catch (error) {
    await db.order.update({
      where: { id: order.id },
      data: { status: "PAYMENT_INIT_FAILED" }
    });
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to start payment." },
      { status: 502 }
    );
  }
};
