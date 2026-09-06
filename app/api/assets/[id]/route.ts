import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;
  const asset = await db.asset.findUnique({ where: { id } });
  if (!asset) return new Response("Not found", { status: 404 });

  return new Response(asset.data, {
    headers: {
      "Content-Type": asset.contentType,
      "Content-Disposition": `inline; filename="${asset.fileName.replace(/["\\]/g, "")}"`,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff"
    }
  });
};
