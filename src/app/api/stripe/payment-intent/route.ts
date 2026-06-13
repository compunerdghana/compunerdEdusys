import Stripe from "stripe";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

  const stripe = new Stripe(key, { apiVersion: "2026-05-27.dahlia" });
  const { amount, currency = "usd", metadata } = await request.json();

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
