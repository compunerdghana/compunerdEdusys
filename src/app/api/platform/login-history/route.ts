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

export async function GET(request: NextRequest) {
  try {
    const admin = getAdmin();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);

    let query = admin
      .from("platform_login_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;

    if (isMissing(error)) {
      return NextResponse.json({ history: [] });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ history: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await request.json();
    const {
      user_id,
      user_email,
      status,
      ip_address,
      device,
      browser,
      location,
      failure_reason,
    } = body;

    if (!user_email) {
      return NextResponse.json({ error: "user_email is required" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("platform_login_history")
      .insert({
        user_id,
        user_email,
        status: status ?? "success",
        ip_address,
        device,
        browser,
        location,
        failure_reason,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If failed login, increment failed_login_count and potentially lock
    if (status === "failed" && user_id) {
      const { data: user } = await admin
        .from("platform_users")
        .select("failed_login_count, status")
        .eq("id", user_id)
        .single();

      if (user && user.status !== "locked") {
        const newCount = (user.failed_login_count ?? 0) + 1;
        const updates: Record<string, unknown> = { failed_login_count: newCount };

        if (newCount >= 5) {
          updates.status = "locked";
          updates.locked_at = new Date().toISOString();

          await admin.from("platform_security_events").insert({
            user_id,
            user_email,
            event_type: "account_auto_locked",
            severity: "high",
            description: `Account automatically locked after ${newCount} failed login attempts`,
          });
        }

        await admin.from("platform_users").update(updates).eq("id", user_id);
      }
    }

    return NextResponse.json({ record: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
