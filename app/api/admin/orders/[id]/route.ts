import { isAdminRequest } from "@/lib/auth";
import { db } from "@/lib/db";

const allowedStatuses = new Set([
  "AWAITING_PAYMENT",
  "PAYMENT_INIT_FAILED",
  "PAID",
  "PREPARING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED"
]);

export const PUT = async (request: Request, context: { params: Promise<{ id: string }> }) => {
  if (!(await isAdminRequest())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => null) as { status?: unknown } | null;
  const status = typeof body?.status === "string" ? body.status : "";
  if (!allowedStatuses.has(status)) {
    return Response.json({ error: "Invalid order status." }, { status: 400 });
  }
  const order = await db.order.update({ where: { id }, data: { status } });
  return Response.json({ order });
};
