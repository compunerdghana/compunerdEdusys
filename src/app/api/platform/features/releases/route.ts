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
      .from("feature_releases")
      .select("*")
      .order("release_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (isMissing(error)) {
      return NextResponse.json({ releases: [] });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ releases: data ?? [] });
  } catch (err) {
    console.error("GET platform/features/releases error", err);
    return NextResponse.json({ error: "Failed to load releases" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await request.json();
    const { version, name, description, feature_ids, bug_fixes, release_date } = body;

    if (!version) {
      return NextResponse.json({ error: "version is required" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("feature_releases")
      .insert({
        version,
        name: name ?? null,
        description: description ?? null,
        feature_ids: feature_ids ?? [],
        bug_fixes: bug_fixes ?? [],
        release_date: release_date ?? null,
        status: "planned",
      })
      .select()
      .single();

    if (isMissing(error)) {
      return NextResponse.json({ error: "feature_releases table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ release: data }, { status: 201 });
  } catch (err) {
    console.error("POST platform/features/releases error", err);
    return NextResponse.json({ error: "Failed to create release" }, { status: 500 });
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
    const updates: Record<string, unknown> = { ...body };
    delete updates.id;

    const { data, error } = await admin
      .from("feature_releases")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (isMissing(error)) {
      return NextResponse.json({ error: "feature_releases table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ release: data });
  } catch (err) {
    console.error("PATCH platform/features/releases error", err);
    return NextResponse.json({ error: "Failed to update release" }, { status: 500 });
  }
}
