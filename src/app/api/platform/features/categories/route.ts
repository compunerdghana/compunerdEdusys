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

    const { data: categories, error } = await admin
      .from("feature_categories")
      .select("*")
      .order("sort_order", { ascending: true });

    if (isMissing(error)) {
      return NextResponse.json({ categories: [] });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Attach feature counts
    const { data: counts } = await admin
      .from("platform_features")
      .select("category_id");

    const countMap: Record<string, number> = {};
    for (const row of counts ?? []) {
      if (row.category_id) {
        countMap[row.category_id] = (countMap[row.category_id] ?? 0) + 1;
      }
    }

    const enriched = (categories ?? []).map((c: Record<string, unknown>) => ({
      ...c,
      feature_count: countMap[c.id as string] ?? 0,
    }));

    return NextResponse.json({ categories: enriched });
  } catch (err) {
    console.error("GET platform/features/categories error", err);
    return NextResponse.json({ error: "Failed to load categories" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await request.json();
    const { name, description, icon, color, sort_order } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("feature_categories")
      .insert({
        name,
        description: description ?? null,
        icon: icon ?? "Layout",
        color: color ?? "#6b7280",
        sort_order: sort_order ?? 0,
      })
      .select()
      .single();

    if (isMissing(error)) {
      return NextResponse.json({ error: "feature_categories table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ category: data }, { status: 201 });
  } catch (err) {
    console.error("POST platform/features/categories error", err);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
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
      .from("feature_categories")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (isMissing(error)) {
      return NextResponse.json({ error: "feature_categories table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ category: data });
  } catch (err) {
    console.error("PATCH platform/features/categories error", err);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
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

    // Check if any features use this category
    const { data: features, error: featuresError } = await admin
      .from("platform_features")
      .select("id")
      .eq("category_id", id)
      .limit(1);

    if (!isMissing(featuresError) && featuresError) {
      return NextResponse.json({ error: featuresError.message }, { status: 500 });
    }
    if (features && features.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete category that has features assigned to it" },
        { status: 409 },
      );
    }

    const { error } = await admin.from("feature_categories").delete().eq("id", id);

    if (isMissing(error)) {
      return NextResponse.json({ error: "feature_categories table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE platform/features/categories error", err);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
