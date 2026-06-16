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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = getAdmin();
    const { id } = await params;
    const body = await request.json();
    const { action } = body as { action: "lock" | "unlock" | "suspend" | "force_logout" };

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    let statusUpdate: Record<string, unknown> = {};
    let eventType = "";
    let description = "";

    switch (action) {
      case "lock":
        statusUpdate = { status: "locked", locked_at: new Date().toISOString() };
        eventType = "account_locked";
        description = "Account manually locked by admin";
        break;
      case "unlock":
        statusUpdate = { status: "active", locked_at: null, failed_login_count: 0 };
        eventType = "account_unlocked";
        description = "Account unlocked by admin";
        break;
      case "suspend":
        statusUpdate = { status: "suspended" };
        eventType = "account_suspended";
        description = "Account suspended by admin";
        break;
      case "force_logout":
        // Delete all active sessions
        await admin.from("platform_active_sessions").delete().eq("user_id", id);
        eventType = "force_logout";
        description = "All active sessions terminated by admin";
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (Object.keys(statusUpdate).length > 0) {
      const { error: updateError } = await admin
        .from("platform_users")
        .update(statusUpdate)
        .eq("id", id);

      if (updateError && !isMissing(updateError)) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    // Log to audit logs
    await admin.from("platform_audit_logs").insert({
      actor_id: id,
      action: eventType,
      resource_type: "platform_user",
      resource_id: id,
      description,
    });

    // Log security event
    await admin.from("platform_security_events").insert({
      user_id: id,
      event_type: eventType,
      severity: action === "force_logout" ? "medium" : "high",
      description,
    });

    return NextResponse.json({ success: true, action });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
