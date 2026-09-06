const PAYSTACK_BASE_URL = "https://api.paystack.co";

const secretKey = () => process.env.PAYSTACK_SECRET_KEY ?? "";

export const initializePaystackTransaction = async (input: {
  email: string;
  amountPesewas: number;
  reference: string;
  callbackUrl: string;
  orderCode: string;
}) => {
  if (!secretKey()) throw new Error("Paystack is not configured.");

  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: input.email,
      amount: String(input.amountPesewas),
      currency: "GHS",
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: { orderCode: input.orderCode }
    }),
    cache: "no-store"
  });

  const payload = await response.json();
  if (!response.ok || !payload?.status || !payload?.data?.authorization_url) {
    throw new Error(payload?.message ?? "Paystack could not initialize this transaction.");
  }
  return payload.data as {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
};

export const verifyPaystackTransaction = async (reference: string) => {
  if (!secretKey()) throw new Error("Paystack is not configured.");
  const response = await fetch(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${secretKey()}` },
      cache: "no-store"
    }
  );
  const payload = await response.json();
  if (!response.ok || !payload?.status) {
    throw new Error(payload?.message ?? "Unable to verify Paystack transaction.");
  }
  return payload.data as {
    status: string;
    amount: number;
    reference: string;
    paid_at?: string;
    currency?: string;
  };
};
