import { isAdminRequest } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const GET = async () => {
  if (!(await isAdminRequest())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const orders = await db.order.findMany({ orderBy: { createdAt: "desc" }, take: 250 });
  return Response.json({ orders });
};
