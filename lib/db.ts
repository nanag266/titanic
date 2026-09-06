import PocketBase, { ClientResponseError, type RecordModel } from "pocketbase";

export type SiteConfig = {
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
  updatedAt: Date;
};

type MenuItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  image: string;
  pricePesewas: number | null;
  variants: unknown[];
  available: boolean;
  featured: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};
type Asset = { id: string; fileName: string; contentType: string; data: string };
type Order = Record<string, any> & { id: string; createdAt: Date; updatedAt: Date };

const client = new PocketBase(process.env.POCKETBASE_URL || "http://127.0.0.1:8090");
let authentication: Promise<void> | null = null;

const ensureAuthenticated = async () => {
  if (client.authStore.isValid) return;
  const email = process.env.POCKETBASE_ADMIN_EMAIL;
  const password = process.env.POCKETBASE_ADMIN_PASSWORD;
  if (!email || !password) throw new Error("POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD are required.");
  authentication ??= client.collection("_superusers").authWithPassword(email, password)
    .then(() => undefined)
    .catch((error) => { authentication = null; throw error; });
  await authentication;
};

const dates = (record: RecordModel) => ({ createdAt: new Date(record.created), updatedAt: new Date(record.updated) });
const escape = (value: string) => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const missing = (error: unknown) => error instanceof ClientResponseError && error.status === 404;

const mapMenuItem = (record: RecordModel): MenuItem => ({
  id: record.id,
  slug: record.slug,
  name: record.name,
  description: record.description ?? null,
  category: record.category,
  image: record.image,
  pricePesewas: record.pricePesewas ?? null,
  variants: Array.isArray(record.variants) ? record.variants : [],
  available: record.available ?? true,
  featured: record.featured ?? false,
  sortOrder: record.sortOrder ?? 0,
  ...dates(record)
});

const defaults = {
  restaurantName: "Titanic City Ventures", tagline: "A Place to Be!",
  heroTitle: "Accra's table, turned all the way up.",
  heroSubtitle: "Bold Ghanaian favourites, grills, rice dishes and more — ordered online and delivered across our Accra service area.",
  phone: "+233 54 324 5511", whatsapp: "", address: "Titanic Beach, Tema, Ghana",
  restaurantPlaceId: "ChIJE7EZ2K-H3w8R8efP8YXbK-w", restaurantLat: null, restaurantLng: null,
  deliveryBaseFeePesewas: 400, deliveryPerKmPesewas: 150, deliveryPerMinutePesewas: 10,
  deliveryMinimumFeePesewas: 1000, deliveryTrafficWeight: 0.6, deliveryTrafficCap: 1.25,
  deliverySurgeMultiplier: 1, deliveryRoundToPesewas: 100, maxDeliveryKm: null,
  serviceMinLat: 5.45, serviceMaxLat: 5.75, serviceMinLng: -0.35, serviceMaxLng: -0.05,
  ordersEnabled: true
};

const mapConfig = (record: RecordModel): SiteConfig => {
  const { id: _id, created: _created, updated: _updated, ...fields } = record;
  return {
    id: 1,
    ...defaults,
    ...fields,
    maxDeliveryKm: typeof fields.maxDeliveryKm === "number" && fields.maxDeliveryKm > 0
      ? fields.maxDeliveryKm
      : null,
    ...dates(record)
  } as SiteConfig;
};
const findConfig = async () => {
  await ensureAuthenticated();
  try { return await client.collection("site_config").getFirstListItem("id != ''"); }
  catch (error) { if (missing(error)) return null; throw error; }
};
const upsertConfig = async (data: Record<string, unknown> = {}) => {
  const current = await findConfig();
  if (current && Object.keys(data).length === 0) return mapConfig(current);
  if (current) return mapConfig(await client.collection("site_config").update(current.id, data));
  return mapConfig(await client.collection("site_config").create({ ...defaults, ...data }));
};

const menuItem = {
  findMany: async ({ where, orderBy, take }: { where?: any; orderBy?: any; take?: number } = {}) => {
    await ensureAuthenticated();
    const filters: string[] = [];
    if (where?.available !== undefined) filters.push(`available = ${where.available}`);
    if (where?.id?.in?.length) filters.push(`(${where.id.in.map((id: string) => `id = "${escape(id)}"`).join(" || ")})`);
    const sort = Array.isArray(orderBy) ? orderBy.flatMap((entry) => Object.entries(entry).map(([key, direction]) => `${direction === "desc" ? "-" : "+"}${key}`)).join(",") : "-created";
    const result = await client.collection("menu_items").getFullList({ filter: filters.join(" && "), sort });
    return result.slice(0, take ?? result.length).map(mapMenuItem);
  },
  findUnique: async ({ where }: { where: Record<string, string> }) => {
    await ensureAuthenticated();
    const [field, value] = Object.entries(where)[0];
    try { return mapMenuItem(await client.collection("menu_items").getFirstListItem(`${field} = "${escape(value)}"`)); }
    catch (error) { if (missing(error)) return null; throw error; }
  },
  create: async ({ data }: { data: Record<string, unknown> }) => { await ensureAuthenticated(); return mapMenuItem(await client.collection("menu_items").create(data)); },
  update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => { await ensureAuthenticated(); return mapMenuItem(await client.collection("menu_items").update(where.id, data)); },
  delete: async ({ where }: { where: { id: string } }) => { await ensureAuthenticated(); await client.collection("menu_items").delete(where.id); }
};

const siteConfig = {
  upsert: async ({ update }: { where: { id: number }; update: Record<string, unknown>; create: Record<string, unknown> }) =>
    upsertConfig(update)
};
const mapOrder = (record: RecordModel): Order => ({ ...record, ...dates(record) });
const order = {
  findMany: async ({ take }: { orderBy?: any; take?: number } = {}) => { await ensureAuthenticated(); return (await client.collection("orders").getList(1, take ?? 250, { sort: "-created" })).items.map(mapOrder); },
  findUnique: async ({ where }: { where: Record<string, string> }) => { await ensureAuthenticated(); const [field, value] = Object.entries(where)[0]; try { return mapOrder(await client.collection("orders").getFirstListItem(`${field} = "${escape(value)}"`)); } catch (error) { if (missing(error)) return null; throw error; } },
  create: async ({ data }: { data: Record<string, unknown> }) => { await ensureAuthenticated(); return mapOrder(await client.collection("orders").create(data)); },
  update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => { await ensureAuthenticated(); return mapOrder(await client.collection("orders").update(where.id, data)); }
};
const asset = {
  create: async ({ data }: { data: { fileName: string; contentType: string; data: Uint8Array } }) => { await ensureAuthenticated(); return await client.collection("assets").create({ fileName: data.fileName, contentType: data.contentType, data: Buffer.from(data.data).toString("base64") }) as Asset; },
  findUnique: async ({ where }: { where: { id: string } }) => { await ensureAuthenticated(); try { return await client.collection("assets").getOne(where.id) as Asset; } catch (error) { if (missing(error)) return null; throw error; } }
};

export const db = { menuItem, siteConfig, order, asset };
