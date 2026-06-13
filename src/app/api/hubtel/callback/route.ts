import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const body = await request.json();

  // Hubtel sends payment status in callback
  const { ResponseCode, ClientReference, Amount, TransactionId } = body?.Data ?? {};

  if (ResponseCode !== "0000") {
    return NextResponse.json({ received: true });
  }

  // Mark payment as paid using the clientReference (which is our fee_payment id)
  if (ClientReference) {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    await admin.from("fee_payments").update({
      payment_status: "paid",
      balance: 0,
      hubtel_transaction_id: TransactionId ?? null,
      paid_at: new Date().toISOString(),
    }).eq("id", ClientReference);
  }

  return NextResponse.json({ received: true });
}
