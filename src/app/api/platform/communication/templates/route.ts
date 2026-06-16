import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

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
  const channel = url.searchParams.get("channel");
  const category = url.searchParams.get("category");

  let q = admin
    .from("communication_templates")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (channel && channel !== "all") q = q.eq("channel", channel);
  if (category) q = q.eq("category", category);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(req: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await req.json();
    const { name, category = "general", channel = "all", subject, body: tmplBody, variables = [], created_by } = body;

    if (!name || !tmplBody) {
      return NextResponse.json({ error: "name and body are required" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("communication_templates")
      .insert({ name, category, channel, subject: subject ?? null, body: tmplBody, variables, created_by: created_by ?? null })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ template: data });
  } catch (err) {
    console.error("templates POST error", err);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
