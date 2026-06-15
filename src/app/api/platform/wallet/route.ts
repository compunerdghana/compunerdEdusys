import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const isMissing = (e: unknown) =>
  (e as { code?: string; message?: string })?.code === "42P01" ||
  (e as { message?: string })?.message?.includes("does not exist");

export async function GET() {
  try {
    const admin = getAdmin();

    // Get wallet
    const { data: wallet, error: walletErr } = await admin
      .from("platform_wallet")
      .select("*")
      .limit(1)
      .single();

    if (isMissing(walletErr)) {
      return NextResponse.json({
        wallet: { balance: 0, total_income: 0, total_expenses: 0, currency: "GHS" },
        transactions: [],
      });
    }
    if (walletErr && walletErr.code !== "PGRST116") {
      return NextResponse.json({ error: walletErr.message }, { status: 500 });
    }

    // Recent transactions
    const { data: transactions, error: txErr } = await admin
      .from("platform_transactions")
      .select("*, schools ( name )")
      .order("created_at", { ascending: false })
      .limit(20);

    if (isMissing(txErr)) {
      return NextResponse.json({ wallet: wallet ?? null, transactions: [] });
    }

    return NextResponse.json({
      wallet: wallet ?? null,
      transactions: transactions ?? [],
    });
  } catch (err) {
    console.error("GET platform/wallet error", err);
    return NextResponse.json({ error: "Failed to load wallet" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await request.json();

    const {
      type,
      category,
      amount,
      school_id,
      subscription_id,
      description,
      reference,
      recorded_by,
    } = body;

    if (!type || !category || amount === undefined) {
      return NextResponse.json(
        { error: "type, category and amount are required" },
        { status: 400 },
      );
    }

    if (!["income", "expense"].includes(type)) {
      return NextResponse.json(
        { error: "type must be income or expense" },
        { status: 400 },
      );
    }

    const numAmount = Number(amount);

    // Insert transaction
    const { data: tx, error: txErr } = await admin
      .from("platform_transactions")
      .insert({
        type,
        category,
        amount: numAmount,
        school_id: school_id ?? null,
        subscription_id: subscription_id ?? null,
        description: description ?? null,
        reference: reference ?? null,
        recorded_by: recorded_by ?? null,
      })
      .select()
      .single();

    if (isMissing(txErr)) {
      return NextResponse.json({ error: "platform_transactions table not found" }, { status: 500 });
    }
    if (txErr) {
      return NextResponse.json({ error: txErr.message }, { status: 500 });
    }

    // Update wallet balance
    const { data: wallet } = await admin
      .from("platform_wallet")
      .select("id, balance, total_income, total_expenses")
      .limit(1)
      .single();

    if (wallet) {
      const isIncome = type === "income";
      await admin
        .from("platform_wallet")
        .update({
          balance: Number(wallet.balance) + (isIncome ? numAmount : -numAmount),
          total_income: isIncome
            ? Number(wallet.total_income) + numAmount
            : wallet.total_income,
          total_expenses: !isIncome
            ? Number(wallet.total_expenses) + numAmount
            : wallet.total_expenses,
          updated_at: new Date().toISOString(),
        })
        .eq("id", wallet.id);
    }

    return NextResponse.json({ transaction: tx });
  } catch (err) {
    console.error("POST platform/wallet error", err);
    return NextResponse.json({ error: "Failed to record transaction" }, { status: 500 });
  }
}
