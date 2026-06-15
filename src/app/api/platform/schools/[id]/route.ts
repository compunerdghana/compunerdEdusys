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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = getAdmin();
    const { id } = await params;

    const { data: school, error: schoolErr } = await admin
      .from("schools")
      .select(
        `*, school_subscriptions (
           *, subscription_plans ( * )
         ), school_onboarding (*)`,
      )
      .eq("id", id)
      .single();

    if (schoolErr) {
      return NextResponse.json({ error: schoolErr.message }, { status: 404 });
    }

    // Student count
    let studentCount = school.student_count ?? 0;
    const { count: sc } = await admin
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("school_id", id);
    if (sc !== null) studentCount = sc;

    // Staff count
    let staffCount = school.staff_count ?? 0;
    const { count: stc } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("school_id", id)
      .not("role", "in", '("parent","student")');
    if (stc !== null) staffCount = stc;

    return NextResponse.json({
      ...school,
      student_count: studentCount,
      staff_count: staffCount,
    });
  } catch (err) {
    console.error("GET platform/schools/[id] error", err);
    return NextResponse.json({ error: "Failed to load school" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = getAdmin();
    const { id } = await params;
    const body = await request.json();

    const { actor_id, actor_name, actor_role, ...updates } = body;

    const { data, error } = await admin
      .from("schools")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (isMissing(error)) {
      return NextResponse.json({ error: "Schools table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await admin.from("platform_audit_logs").insert({
      actor_id: actor_id ?? null,
      actor_name: actor_name ?? null,
      actor_role: actor_role ?? null,
      action: "school.updated",
      target_type: "school",
      target_id: id,
      target_name: data?.name,
      details: updates,
    });

    return NextResponse.json({ school: data });
  } catch (err) {
    console.error("PATCH platform/schools/[id] error", err);
    return NextResponse.json({ error: "Failed to update school" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = getAdmin();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { actor_id, actor_name, actor_role } = body;

    const { data, error } = await admin
      .from("schools")
      .update({ status: "archived" })
      .eq("id", id)
      .select("name")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await admin.from("platform_audit_logs").insert({
      actor_id: actor_id ?? null,
      actor_name: actor_name ?? null,
      actor_role: actor_role ?? null,
      action: "school.archived",
      target_type: "school",
      target_id: id,
      target_name: data?.name,
      details: {},
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE platform/schools/[id] error", err);
    return NextResponse.json({ error: "Failed to archive school" }, { status: 500 });
  }
}
