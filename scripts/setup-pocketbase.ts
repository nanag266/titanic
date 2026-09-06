import PocketBase from "pocketbase";

const url = process.env.POCKETBASE_URL;
const email = process.env.POCKETBASE_ADMIN_EMAIL;
const password = process.env.POCKETBASE_ADMIN_PASSWORD;

if (!url || !email || !password) {
  throw new Error("Set POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD before setup.");
}

const pb = new PocketBase(url);
await pb.collection("_superusers").authWithPassword(email, password);

const collections = [
  {
    name: "menu_items",
    fields: [
      { name: "slug", type: "text", required: true, unique: true, max: 120 },
      { name: "name", type: "text", required: true, max: 120 },
      { name: "description", type: "text", max: 400 },
      { name: "category", type: "text", required: true, max: 80 },
      { name: "image", type: "text", required: true, max: 500 },
      { name: "pricePesewas", type: "number", min: 0 },
      { name: "variants", type: "json" },
      { name: "available", type: "bool" },
      { name: "featured", type: "bool" },
      { name: "sortOrder", type: "number", noDecimal: true }
    ]
  },
  {
    name: "site_config",
    fields: [
      { name: "restaurantName", type: "text", max: 120 }, { name: "tagline", type: "text", max: 160 },
      { name: "heroTitle", type: "text", max: 180 }, { name: "heroSubtitle", type: "text", max: 400 },
      { name: "phone", type: "text", max: 50 }, { name: "whatsapp", type: "text", max: 50 },
      { name: "address", type: "text", max: 250 }, { name: "restaurantPlaceId", type: "text", max: 200 },
      { name: "restaurantLat", type: "number" }, { name: "restaurantLng", type: "number" },
      { name: "deliveryBaseFeePesewas", type: "number", noDecimal: true }, { name: "deliveryPerKmPesewas", type: "number", noDecimal: true },
      { name: "deliveryPerMinutePesewas", type: "number", noDecimal: true }, { name: "deliveryMinimumFeePesewas", type: "number", noDecimal: true },
      { name: "deliveryTrafficWeight", type: "number" }, { name: "deliveryTrafficCap", type: "number" },
      { name: "deliverySurgeMultiplier", type: "number" }, { name: "deliveryRoundToPesewas", type: "number", noDecimal: true },
      { name: "maxDeliveryKm", type: "number" }, { name: "serviceMinLat", type: "number" }, { name: "serviceMaxLat", type: "number" },
      { name: "serviceMinLng", type: "number" }, { name: "serviceMaxLng", type: "number" }, { name: "ordersEnabled", type: "bool" }
    ]
  },
  {
    name: "assets",
    fields: [
      { name: "fileName", type: "text", required: true, max: 180 },
      { name: "contentType", type: "text", required: true, max: 100 },
      { name: "data", type: "text", required: true, max: 6000000 }
    ]
  },
  {
    name: "orders",
    fields: [
      { name: "code", type: "text", required: true, unique: true, max: 80 }, { name: "customerName", type: "text", required: true, max: 120 },
      { name: "email", type: "email", required: true }, { name: "phone", type: "text", required: true, max: 40 },
      { name: "deliveryAddress", type: "text", required: true, max: 300 }, { name: "deliveryLat", type: "number", required: true },
      { name: "deliveryLng", type: "number", required: true }, { name: "distanceKm", type: "number", required: true },
      { name: "deliveryDurationMinutes", type: "number" }, { name: "deliveryPricingMultiplier", type: "number" },
      { name: "deliveryFeePesewas", type: "number", required: true, noDecimal: true }, { name: "subtotalPesewas", type: "number", required: true, noDecimal: true },
      { name: "totalPesewas", type: "number", required: true, noDecimal: true }, { name: "items", type: "json" },
      { name: "status", type: "text", max: 40 }, { name: "paymentStatus", type: "text", max: 40 },
      { name: "paystackReference", type: "text", unique: true, max: 120 }, { name: "paidAt", type: "date" }
    ]
  }
];

for (const definition of collections) {
  try {
    await pb.collections.getFirstListItem(`name = "${definition.name}"`);
    console.log(`PocketBase collection exists: ${definition.name}`);
  } catch {
    await pb.collections.create({
      name: definition.name,
      type: "base",
      fields: definition.fields,
      listRule: "",
      viewRule: "",
      createRule: "",
      updateRule: "",
      deleteRule: ""
    });
    console.log(`Created PocketBase collection: ${definition.name}`);
  }
}
