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
      .from("feature_rollouts")
      .select(`
        *,
        feature:platform_features(id, name, code, status)
      `)
      .order("created_at", { ascending: false });

    if (isMissing(error)) {
      return NextResponse.json({ rollouts: [] });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rollouts: data ?? [] });
  } catch (err) {
    console.error("GET platform/features/rollouts error", err);
    return NextResponse.json({ error: "Failed to load rollouts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await request.json();
    const {
      feature_id,
      rollout_type,
      name,
      description,
      start_date,
      end_date,
      target_regions,
      target_school_ids,
      created_by,
    } = body;

    if (!feature_id) {
      return NextResponse.json({ error: "feature_id is required" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("feature_rollouts")
      .insert({
        feature_id,
        rollout_type: rollout_type ?? "global",
        name: name ?? null,
        description: description ?? null,
        start_date: start_date ?? null,
        end_date: end_date ?? null,
        target_regions: target_regions ?? [],
        target_school_ids: target_school_ids ?? [],
        status: "planned",
        adoption_rate: 0,
        created_by: created_by ?? null,
        updated_at: new Date().toISOString(),
      })
      .select(`*, feature:platform_features(id, name, code, status)`)
      .single();

    if (isMissing(error)) {
      return NextResponse.json({ error: "feature_rollouts table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rollout: data }, { status: 201 });
  } catch (err) {
    console.error("POST platform/features/rollouts error", err);
    return NextResponse.json({ error: "Failed to create rollout" }, { status: 500 });
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
      .from("feature_rollouts")
      .update(updates)
      .eq("id", id)
      .select(`*, feature:platform_features(id, name, code, status)`)
      .single();

    if (isMissing(error)) {
      return NextResponse.json({ error: "feature_rollouts table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rollout: data });
  } catch (err) {
    console.error("PATCH platform/features/rollouts error", err);
    return NextResponse.json({ error: "Failed to update rollout" }, { status: 500 });
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

    const { error } = await admin.from("feature_rollouts").delete().eq("id", id);

    if (isMissing(error)) {
      return NextResponse.json({ error: "feature_rollouts table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE platform/features/rollouts error", err);
    return NextResponse.json({ error: "Failed to delete rollout" }, { status: 500 });
  }
}
