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
  const page = Number(url.searchParams.get("page") ?? 1);
  const limit = Number(url.searchParams.get("limit") ?? 30);
  const offset = (page - 1) * limit;
  const channel = url.searchParams.get("channel");
  const status = url.searchParams.get("status");
  const school = url.searchParams.get("school");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  let q = admin
    .from("platform_comm_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (channel) q = q.eq("channel", channel);
  if (status) q = q.eq("status", status);
  if (school) q = q.ilike("school_name", `%${school}%`);
  if (from) q = q.gte("created_at", from);
  if (to) q = q.lte("created_at", to);

  const { data, count, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ logs: data ?? [], total: count ?? 0, page, limit });
}
