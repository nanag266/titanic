import { isAdminRequest } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const unauthorized = () => Response.json({ error: "Unauthorized" }, { status: 401 });
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

type Variant = { id?: unknown; label?: unknown; pricePesewas?: unknown };
type NormalizedVariant = { id: string; label: string; pricePesewas: number | null };
const normalizeVariants = (value: unknown): NormalizedVariant[] | undefined => {
  if (value === null) return [];
  if (!Array.isArray(value)) return undefined;
  const variants = value.slice(0, 20).map((entry, index) => {
    const item = entry as Variant;
    const label = typeof item.label === "string" ? item.label.trim().slice(0, 80) : "";
    if (!label) return null;
    const raw = item.pricePesewas;
    const parsed = raw === null || raw === "" || raw === undefined ? null : Number(raw);
    return {
      id: typeof item.id === "string" && item.id.trim() ? slugify(item.id).slice(0, 80) : `${slugify(label)}-${index + 1}`,
      label,
      pricePesewas: parsed === null || !Number.isFinite(parsed) ? null : Math.max(0, Math.round(parsed))
    };
  }).filter((entry): entry is NormalizedVariant => entry !== null);
  return variants;
};

export const PUT = async (request: Request, context: { params: Promise<{ id: string }> }) => {
  if (!(await isAdminRequest())) return unauthorized();
  const { id } = await context.params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "Invalid request." }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim().slice(0, 120);
  if (typeof body.category === "string" && body.category.trim()) data.category = body.category.trim().slice(0, 80);
  if (typeof body.image === "string" && body.image.trim()) data.image = body.image.trim().slice(0, 500);
  if (typeof body.description === "string") data.description = body.description.trim().slice(0, 400) || null;
  if (typeof body.available === "boolean") data.available = body.available;
  if (typeof body.featured === "boolean") data.featured = body.featured;
  if (Number.isFinite(Number(body.sortOrder))) data.sortOrder = Math.round(Number(body.sortOrder));
  if (Object.prototype.hasOwnProperty.call(body, "pricePesewas")) {
    const raw = body.pricePesewas;
    const parsed = raw === null || raw === "" || raw === undefined ? null : Number(raw);
    data.pricePesewas = parsed === null || !Number.isFinite(parsed) ? null : Math.max(0, Math.round(parsed));
  }
  if (Object.prototype.hasOwnProperty.call(body, "variants")) data.variants = normalizeVariants(body.variants);

  const item = await db.menuItem.update({ where: { id }, data });
  return Response.json({ item });
};

export const DELETE = async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  if (!(await isAdminRequest())) return unauthorized();
  const { id } = await context.params;
  await db.menuItem.delete({ where: { id } });
  return Response.json({ deleted: true });
};
