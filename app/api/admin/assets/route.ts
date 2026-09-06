import { isAdminRequest } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const POST = async (request: Request) => {
  if (!(await isAdminRequest())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "Choose an image to upload." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return Response.json({ error: "Use a JPG, PNG or WebP image." }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    return Response.json({ error: "Images must be 3 MB or smaller." }, { status: 400 });
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const asset = await db.asset.create({
    data: {
      fileName: file.name.slice(0, 180) || "menu-image",
      contentType: file.type,
      data
    }
  });

  return Response.json({
    asset: {
      id: asset.id,
      url: `/api/assets/${asset.id}`
    }
  }, { status: 201 });
};
