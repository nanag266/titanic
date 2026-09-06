"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const PaymentStatus = () => {
  const params = useSearchParams();
  const reference = params.get("reference") || params.get("trxref");
  const orderFromUrl = params.get("order");
  const [state, setState] = useState<"checking" | "paid" | "failed">("checking");
  const [orderCode, setOrderCode] = useState(orderFromUrl || "");
  const [message, setMessage] = useState("Confirming your payment with Paystack…");

  useEffect(() => {
    if (!reference) {
      setState("failed");
      setMessage("No Paystack payment reference was returned.");
      return;
    }

    fetch(`/api/payments/verify?reference=${encodeURIComponent(reference)}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Payment verification failed.");
        setOrderCode(payload.orderCode || orderFromUrl || "");
        if (payload.paid) {
          setState("paid");
          setMessage("Payment confirmed. Titanic City Ventures can now prepare your order.");
        } else {
          setState("failed");
          setMessage("Paystack has not confirmed this payment as successful yet.");
        }
      })
      .catch((error) => {
        setState("failed");
        setMessage(error instanceof Error ? error.message : "Payment verification failed.");
      });
  }, [reference, orderFromUrl]);

  return (
    <main className="status-page">
      <section className="status-card">
        <img src="/brand/logo.png" alt="Titanic City Ventures" />
        <div className="status-mark">{state === "checking" ? "…" : state === "paid" ? "✓" : "!"}</div>
        <h1>{state === "checking" ? "Checking payment" : state === "paid" ? "Order confirmed" : "Payment not confirmed"}</h1>
        <p>{message}</p>
        {orderCode ? <p><strong>Order:</strong> {orderCode}</p> : null}
        <a href="/" className="primary-button">Back to the menu</a>
      </section>
    </main>
  );
};

export default function PaymentCallbackPage() {
  return <Suspense fallback={<main className="status-page"><section className="status-card">Loading…</section></main>}><PaymentStatus /></Suspense>;
}
