import crypto from "node:crypto";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const POST = async (request: Request) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return new Response("Paystack not configured", { status: 503 });

  const raw = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";
  const expected = crypto.createHmac("sha512", secret).update(raw).digest("hex");

  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(raw) as {
    event?: string;
    data?: { reference?: string; amount?: number; status?: string; paid_at?: string; currency?: string };
  };

  if (event.event === "charge.success" && event.data?.reference) {
    const order = await db.order.findUnique({ where: { paystackReference: event.data.reference } });
    if (
      order &&
      event.data.status === "success" &&
      event.data.amount === order.totalPesewas &&
      (!event.data.currency || event.data.currency === "GHS")
    ) {
      await db.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "PAID",
          status: order.status === "AWAITING_PAYMENT" ? "PAID" : order.status,
          paidAt: event.data.paid_at ? new Date(event.data.paid_at) : new Date()
        }
      });
    }
  }

  return new Response("OK", { status: 200 });
};
