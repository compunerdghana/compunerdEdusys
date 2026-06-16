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

    const { data: groups, error } = await admin
      .from("feature_groups")
      .select(`*, category:feature_categories(id, name, icon, color)`)
      .order("name", { ascending: true });

    if (isMissing(error)) {
      return NextResponse.json({ groups: [] });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Attach feature counts
    const { data: counts } = await admin
      .from("platform_features")
      .select("group_id");

    const countMap: Record<string, number> = {};
    for (const row of counts ?? []) {
      if (row.group_id) {
        countMap[row.group_id] = (countMap[row.group_id] ?? 0) + 1;
      }
    }

    const enriched = (groups ?? []).map((g: Record<string, unknown>) => ({
      ...g,
      feature_count: countMap[g.id as string] ?? 0,
    }));

    return NextResponse.json({ groups: enriched });
  } catch (err) {
    console.error("GET platform/features/groups error", err);
    return NextResponse.json({ error: "Failed to load groups" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await request.json();
    const { name, description, category_id } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("feature_groups")
      .insert({
        name,
        description: description ?? null,
        category_id: category_id ?? null,
      })
      .select(`*, category:feature_categories(id, name, icon, color)`)
      .single();

    if (isMissing(error)) {
      return NextResponse.json({ error: "feature_groups table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ group: data }, { status: 201 });
  } catch (err) {
    console.error("POST platform/features/groups error", err);
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
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

    const { error } = await admin.from("feature_groups").delete().eq("id", id);

    if (isMissing(error)) {
      return NextResponse.json({ error: "feature_groups table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE platform/features/groups error", err);
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
  }
}
