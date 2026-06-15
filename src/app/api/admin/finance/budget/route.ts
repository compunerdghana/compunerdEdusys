/**
 * GET  /api/admin/finance/budget?schoolId=X
 * POST /api/admin/finance/budget — create budget
 * PUT  /api/admin/finance/budget — update budget allocated_amount
 */
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { isTableMissing } from "@/lib/finance/wallet-helper";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

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

  const { data: budgets, error } = await getAdmin()
    .from("budgets")
    .select(`*, category:expense_categories(id,name)`)
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  if (isTableMissing(error)) return NextResponse.json({ tableNotReady: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Compute used_amount from approved expenses per budget category/period
  const enriched = await Promise.all(
    (budgets ?? []).map(async (budget: Record<string, unknown>) => {
      if (!budget.category_id) return { ...budget, computed_used: 0 };

      const { data: expenses } = await getAdmin()
        .from("expenses")
        .select("amount")
        .eq("school_id", schoolId)
        .eq("category_id", budget.category_id as string)
        .eq("status", "approved")
        .gte("expense_date", budget.period_start as string)
        .lte("expense_date", budget.period_end as string);

      const computed_used = (expenses ?? []).reduce((sum: number, e: { amount: number }) => sum + Number(e.amount), 0);
      return { ...budget, computed_used };
    })
  );

  return NextResponse.json({ budgets: enriched });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { school_id, name, category_id, period_start, period_end, allocated_amount } = await req.json();
  if (!school_id || !name || !period_start || !period_end || !allocated_amount) {
    return NextResponse.json({ error: "school_id, name, period_start, period_end, allocated_amount required" }, { status: 400 });
  }

  const { data, error } = await getAdmin().from("budgets").insert({
    school_id,
    name,
    category_id: category_id ?? null,
    period_start,
    period_end,
    allocated_amount: Number(allocated_amount),
    created_by: user.id,
  }).select("*").single();

  if (isTableMissing(error)) return NextResponse.json({ tableNotReady: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, budget: data });
}

export async function PUT(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, allocated_amount, name, period_start, period_end } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (allocated_amount !== undefined) updates.allocated_amount = Number(allocated_amount);
  if (name !== undefined) updates.name = name;
  if (period_start !== undefined) updates.period_start = period_start;
  if (period_end !== undefined) updates.period_end = period_end;

  const { data, error } = await getAdmin().from("budgets").update(updates).eq("id", id).select("*").single();

  if (isTableMissing(error)) return NextResponse.json({ tableNotReady: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, budget: data });
}
