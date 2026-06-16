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

const STATUS_MAP: Record<string, string> = {
  suspend: "suspended",
  activate: "active",
  archive: "archived",
  restore: "active",
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = getAdmin();
    const { id } = await params;
    const body = await request.json();
    const { action, reason, changed_by, changed_by_name } = body as {
      action: "suspend" | "activate" | "archive" | "restore";
      reason?: string;
      changed_by?: string;
      changed_by_name?: string;
    };

    if (!action || !STATUS_MAP[action]) {
      return NextResponse.json(
        { error: "action must be one of: suspend, activate, archive, restore" },
        { status: 400 },
      );
    }

    const newStatus = STATUS_MAP[action];

    // Fetch current school to capture old status
    const { data: current, error: fetchErr } = await admin
      .from("schools")
      .select("id, name, status")
      .eq("id", id)
      .single();

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 404 });
    }

    const oldStatus = current.status;

    // Update schools.status
    const { data: updated, error: updateErr } = await admin
      .from("schools")
      .update({ status: newStatus })
      .eq("id", id)
      .select()
      .single();

    if (isMissing(updateErr)) {
      return NextResponse.json({ error: "Schools table not found" }, { status: 500 });
    }
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Insert into school_status_history
    const { error: historyErr } = await admin.from("school_status_history").insert({
      school_id: id,
      old_status: oldStatus,
      new_status: newStatus,
      reason: reason ?? null,
      changed_by: changed_by ?? null,
      changed_by_name: changed_by_name ?? null,
    });
    if (historyErr && !isMissing(historyErr)) {
      console.error("school_status_history insert error", historyErr);
    }

    // Insert into platform_audit_logs
    await admin.from("platform_audit_logs").insert({
      actor_id: changed_by ?? null,
      actor_name: changed_by_name ?? null,
      action: `school.${action}`,
      target_type: "school",
      target_id: id,
      target_name: current.name,
      details: { old_status: oldStatus, new_status: newStatus, reason: reason ?? null },
    });

    return NextResponse.json({ school: updated });
  } catch (err) {
    console.error("POST platform/schools/[id]/status error", err);
    return NextResponse.json({ error: "Failed to update school status" }, { status: 500 });
  }
}
