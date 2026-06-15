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

    const { data, error } = await admin
      .from("subscription_plans")
      .select("*")
      .order("sort_order", { ascending: true });

    if (isMissing(error)) {
      return NextResponse.json({ plans: [] });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ plans: data ?? [] });
  } catch (err) {
    console.error("GET platform/plans error", err);
    return NextResponse.json({ error: "Failed to load plans" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await request.json();

    const {
      name,
      display_name,
      description,
      price_monthly,
      price_annual,
      max_students,
      max_staff,
      storage_gb,
      sms_credits,
      whatsapp_credits,
      features = [],
      sort_order = 0,
    } = body;

    if (!name || !display_name) {
      return NextResponse.json(
        { error: "name and display_name are required" },
        { status: 400 },
      );
    }

    const { data, error } = await admin
      .from("subscription_plans")
      .insert({
        name,
        display_name,
        description,
        price_monthly,
        price_annual,
        max_students,
        max_staff,
        storage_gb,
        sms_credits,
        whatsapp_credits,
        features,
        sort_order,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ plan: data });
  } catch (err) {
    console.error("POST platform/plans error", err);
    return NextResponse.json({ error: "Failed to create plan" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("subscription_plans")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ plan: data });
  } catch (err) {
    console.error("PATCH platform/plans error", err);
    return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
  }
}
