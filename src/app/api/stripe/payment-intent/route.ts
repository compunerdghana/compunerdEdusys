import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-05-27.dahlia",
});

export async function POST(request: Request) {
  const { amount, currency = "ghc", metadata } = await request.json();

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // convert to pesewas
    currency,
    automatic_payment_methods: { enabled: true },
    metadata,
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
