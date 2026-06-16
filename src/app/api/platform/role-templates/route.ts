import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET() {
  try {
    const admin = getAdmin();
    const { data: templates, error } = await admin
      .from("school_role_templates")
      .select("*")
      .order("name");

    if (error) throw error;
    return NextResponse.json({ templates: templates ?? [] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await request.json();
    const { name, display_name, description } = body;

    if (!display_name) {
      return NextResponse.json({ error: "display_name is required" }, { status: 400 });
    }

    const roleName = name || display_name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

    const { data, error } = await admin
      .from("school_role_templates")
      .insert({ name: roleName, display_name, description })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
