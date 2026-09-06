import { db } from "@/lib/db";
import { verifyPaystackTransaction } from "@/lib/paystack";

export const dynamic = "force-dynamic";

export const GET = async (request: Request) => {
  const reference = new URL(request.url).searchParams.get("reference")?.trim();
  if (!reference) return Response.json({ error: "Payment reference is required." }, { status: 400 });

  const order = await db.order.findUnique({ where: { paystackReference: reference } });
  if (!order) return Response.json({ error: "Order not found." }, { status: 404 });

  const transaction = await verifyPaystackTransaction(reference);
  const amountMatches = transaction.amount === order.totalPesewas;
  const currencyMatches = !transaction.currency || transaction.currency === "GHS";
  const paid = transaction.status === "success" && amountMatches && currencyMatches;

  if (paid && order.paymentStatus !== "PAID") {
    await db.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
        status: "PAID",
        paidAt: transaction.paid_at ? new Date(transaction.paid_at) : new Date()
      }
    });
  }

  return Response.json({
    paid,
    amountMatches,
    currencyMatches,
    orderCode: order.code,
    status: paid ? "PAID" : transaction.status
  });
};
