import { isAdminRequest } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const unauthorized = () => Response.json({ error: "Unauthorized" }, { status: 401 });
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

type Variant = { id?: unknown; label?: unknown; pricePesewas?: unknown };
type NormalizedVariant = { id: string; label: string; pricePesewas: number | null };

const normalizeVariants = (value: unknown): NormalizedVariant[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const variants = value
    .slice(0, 20)
    .map((entry) => entry as Variant)
    .map((entry, index) => {
      const label = typeof entry.label === "string" ? entry.label.trim().slice(0, 80) : "";
      const rawPrice = entry.pricePesewas;
      const pricePesewas = rawPrice === null || rawPrice === "" || rawPrice === undefined
        ? null
        : Math.max(0, Math.round(Number(rawPrice)));
      if (!label) return null;
      return {
        id: typeof entry.id === "string" && entry.id.trim() ? slugify(entry.id).slice(0, 80) : `${slugify(label)}-${index + 1}`,
        label,
        pricePesewas: Number.isFinite(pricePesewas) ? pricePesewas : null
      };
    })
    .filter((entry): entry is NormalizedVariant => entry !== null);
  return variants;
};

export const GET = async () => {
  if (!(await isAdminRequest())) return unauthorized();
  const items = await db.menuItem.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return Response.json({ items });
};

export const POST = async (request: Request) => {
  if (!(await isAdminRequest())) return unauthorized();
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "Invalid request." }, { status: 400 });

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const category = typeof body.category === "string" ? body.category.trim().slice(0, 80) : "";
  const image = typeof body.image === "string" ? body.image.trim().slice(0, 500) : "";
  if (!name || !category || !image) {
    return Response.json({ error: "Name, category and image are required." }, { status: 400 });
  }

  const requestedSlug = typeof body.slug === "string" ? slugify(body.slug) : "";
  const baseSlug = requestedSlug || slugify(name) || `menu-${Date.now()}`;
  const existing = await db.menuItem.findUnique({ where: { slug: baseSlug } });
  const slug = existing ? `${baseSlug}-${Date.now().toString().slice(-6)}` : baseSlug;
  const rawPrice = body.pricePesewas;
  const pricePesewas = rawPrice === null || rawPrice === "" || rawPrice === undefined ? null : Math.max(0, Math.round(Number(rawPrice)));

  const data = {
    slug,
    name,
    category,
    image,
    description: typeof body.description === "string" ? body.description.trim().slice(0, 400) : null,
    pricePesewas: Number.isFinite(pricePesewas) ? pricePesewas : null,
    variants: normalizeVariants(body.variants) ?? [],
    available: typeof body.available === "boolean" ? body.available : true,
    featured: typeof body.featured === "boolean" ? body.featured : false,
    sortOrder: Number.isFinite(Number(body.sortOrder)) ? Math.round(Number(body.sortOrder)) : 0
  };

  const item = await db.menuItem.create({ data });
  return Response.json({ item }, { status: 201 });
};
