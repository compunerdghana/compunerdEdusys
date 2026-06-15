/**
 * GET  /api/admin/finance/categories?schoolId=X — system + school categories
 * POST /api/admin/finance/categories             — create custom category
 */
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { isTableMissing } from "@/lib/finance/wallet-helper";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function getUser() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const schoolId = req.nextUrl.searchParams.get("schoolId");
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  // System categories (school_id IS NULL) + school-specific
  const { data, error } = await admin
    .from("expense_categories")
    .select("*")
    .or(`school_id.is.null,school_id.eq.${schoolId}`)
    .order("is_system", { ascending: false })
    .order("name", { ascending: true });

  if (isTableMissing(error)) return NextResponse.json({ tableNotReady: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ categories: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { school_id, name } = await req.json();
  if (!school_id || !name) {
    return NextResponse.json({ error: "school_id and name required" }, { status: 400 });
  }

  const { data, error } = await admin.from("expense_categories").insert({
    school_id,
    name,
    is_system: false,
  }).select("*").single();

  if (isTableMissing(error)) return NextResponse.json({ tableNotReady: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, category: data });
}
