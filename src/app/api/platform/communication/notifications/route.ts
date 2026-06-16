import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { resolveTargetSchools } from "@/lib/communication/targeting";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function GET(req: NextRequest) {
  const admin = getAdmin();
  const url = new URL(req.url);
  const page = Number(url.searchParams.get("page") ?? 1);
  const limit = Number(url.searchParams.get("limit") ?? 20);
  const offset = (page - 1) * limit;

  const { data, count } = await admin
    .from("platform_notifications")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  return NextResponse.json({ notifications: data ?? [], total: count ?? 0 });
}

export async function POST(req: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await req.json();
    const {
      title,
      body: notifBody,
      type = "info",
      category = "general",
      target_audience = "all",
      selected_school_ids = [],
      link,
      expires_at,
      created_by,
    } = body;

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    let target_school_ids: string[] = [];
    if (target_audience === "selected" && selected_school_ids.length > 0) {
      target_school_ids = selected_school_ids;
    } else if (target_audience !== "all") {
      const schools = await resolveTargetSchools(target_audience);
      target_school_ids = schools.map((s) => s.id);
    }

    const { data, error } = await admin
      .from("platform_notifications")
      .insert({
        title,
        body: notifBody ?? null,
        type,
        category,
        target_audience,
        target_school_ids,
        link: link ?? null,
        expires_at: expires_at ?? null,
        created_by: created_by ?? null,
        is_active: true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ notification: data });
  } catch (err) {
    console.error("notifications POST error", err);
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await req.json();
    const { id, is_active } = body;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { error } = await admin
      .from("platform_notifications")
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}
