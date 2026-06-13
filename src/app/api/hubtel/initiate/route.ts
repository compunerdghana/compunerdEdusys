import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const clientId = process.env.HUBTEL_CLIENT_ID;
  const clientSecret = process.env.HUBTEL_CLIENT_SECRET;
  const merchantAccount = process.env.HUBTEL_MERCHANT_ACCOUNT;

  if (!clientId || !clientSecret || !merchantAccount) {
    return NextResponse.json({ error: "Hubtel not configured" }, { status: 503 });
  }

  const { amount, description, clientReference, returnUrl, cancelUrl } = await request.json();

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/hubtel/callback`;

  const res = await fetch("https://payproxyapi.hubtel.com/items/initiate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${credentials}`,
    },
    body: JSON.stringify({
      totalAmount: amount,
      description,
      callbackUrl,
      returnUrl,
      cancellationUrl: cancelUrl,
      merchantAccountNumber: merchantAccount,
      clientReference,
    }),
  });

  const data = await res.json();

  if (!res.ok || data.status !== "Success") {
    return NextResponse.json({ error: data.message ?? "Hubtel error" }, { status: 400 });
  }

  return NextResponse.json({ checkoutUrl: data.data?.checkoutDirectUrl });
}
