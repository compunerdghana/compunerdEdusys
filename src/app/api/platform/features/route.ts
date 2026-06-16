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
    const category = searchParams.get("category");
    const q = searchParams.get("q");
    const accessLevel = searchParams.get("access_level");

    let query = admin
      .from("platform_features")
      .select(`
        *,
        category:feature_categories(id, name, icon, color)
      `)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (status) query = query.eq("status", status);
    if (category) query = query.eq("category_id", category);
    if (accessLevel) query = query.eq("access_level", accessLevel);
    if (q) query = query.or(`name.ilike.%${q}%,code.ilike.%${q}%,description.ilike.%${q}%`);

    const { data, error } = await query;

    if (isMissing(error)) {
      return NextResponse.json({ features: [] });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ features: data ?? [] });
  } catch (err) {
    console.error("GET platform/features error", err);
    return NextResponse.json({ error: "Failed to load features" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await request.json();
    const schoolId = body.schoolId || body.school_id;

    if (schoolId) {
      const { feature, enabled } = body;
      const validColumns = [
        "students", "admissions", "finance", "attendance", "academics",
        "exams", "report_cards", "communications", "payroll",
        "inventory", "transport", "hostel"
      ];
      if (!validColumns.includes(feature)) {
        return NextResponse.json({ error: "Invalid feature code" }, { status: 400 });
      }

      const { data, error } = await admin
        .from("school_features")
        .update({ [feature]: enabled, updated_at: new Date().toISOString() })
        .eq("school_id", schoolId)
        .select()
        .single();

      if (error) {
        const { data: upsertData, error: upsertErr } = await admin
          .from("school_features")
          .upsert({ school_id: schoolId, [feature]: enabled, updated_at: new Date().toISOString() })
          .select()
          .single();
        if (upsertErr) {
          return NextResponse.json({ error: upsertErr.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, features: upsertData });
      }

      return NextResponse.json({ success: true, features: data });
    }

    const {
      name,
      code,
      description,
      category_id,
      group_id,
      route_path,
      icon,
      version,
      access_level,
      status,
      display_order,
      is_core,
    } = body;

    if (!name || !code) {
      return NextResponse.json({ error: "name and code are required" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("platform_features")
      .insert({
        name,
        code,
        description: description ?? null,
        category_id: category_id ?? null,
        group_id: group_id ?? null,
        route_path: route_path ?? null,
        icon: icon ?? "Star",
        version: version ?? "1.0.0",
        access_level: access_level ?? "subscription",
        status: status ?? "active",
        display_order: display_order ?? 0,
        is_core: is_core ?? false,
        updated_at: new Date().toISOString(),
      })
      .select(`*, category:feature_categories(id, name, icon, color)`)
      .single();

    if (isMissing(error)) {
      return NextResponse.json({ error: "platform_features table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ feature: data }, { status: 201 });
  } catch (err) {
    console.error("POST platform/features error", err);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
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
      .from("platform_features")
      .update(updates)
      .eq("id", id)
      .select(`*, category:feature_categories(id, name, icon, color)`)
      .single();

    if (isMissing(error)) {
      return NextResponse.json({ error: "platform_features table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ feature: data });
  } catch (err) {
    console.error("PATCH platform/features error", err);
    return NextResponse.json({ error: "Failed to update feature" }, { status: 500 });
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

    // Check for dependencies before deletion
    const { data: deps, error: depsError } = await admin
      .from("feature_dependencies")
      .select("id")
      .or(`feature_id.eq.${id},requires_feature_id.eq.${id}`)
      .limit(1);

    if (!isMissing(depsError) && depsError) {
      return NextResponse.json({ error: depsError.message }, { status: 500 });
    }
    if (deps && deps.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete feature with existing dependencies" },
        { status: 409 },
      );
    }

    const { error } = await admin.from("platform_features").delete().eq("id", id);

    if (isMissing(error)) {
      return NextResponse.json({ error: "platform_features table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE platform/features error", err);
    return NextResponse.json({ error: "Failed to delete feature" }, { status: 500 });
  }
}
