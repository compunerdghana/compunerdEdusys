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
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");

    let query = admin
      .from("feature_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (priority) query = query.eq("priority", priority);

    const { data, error } = await query;

    if (isMissing(error)) {
      return NextResponse.json({ requests: [] });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ requests: data ?? [] });
  } catch (err) {
    console.error("GET platform/features/requests error", err);
    return NextResponse.json({ error: "Failed to load feature requests" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await request.json();
    const { title, description, requested_by, source, school_id, priority } = body;

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("feature_requests")
      .insert({
        title,
        description: description ?? null,
        requested_by: requested_by ?? null,
        source: source ?? "school",
        school_id: school_id ?? null,
        priority: priority ?? "medium",
        votes: 0,
        status: "new",
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (isMissing(error)) {
      return NextResponse.json({ error: "feature_requests table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ request: data }, { status: 201 });
  } catch (err) {
    console.error("POST platform/features/requests error", err);
    return NextResponse.json({ error: "Failed to create feature request" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = getAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = { ...body, updated_at: new Date().toISOString() };
    delete updates.id;

    const { data, error } = await admin
      .from("feature_requests")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (isMissing(error)) {
      return NextResponse.json({ error: "feature_requests table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ request: data });
  } catch (err) {
    console.error("PATCH platform/features/requests error", err);
    return NextResponse.json({ error: "Failed to update feature request" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = getAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { error } = await admin.from("feature_requests").delete().eq("id", id);

    if (isMissing(error)) {
      return NextResponse.json({ error: "feature_requests table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE platform/features/requests error", err);
    return NextResponse.json({ error: "Failed to delete feature request" }, { status: 500 });
  }
}
