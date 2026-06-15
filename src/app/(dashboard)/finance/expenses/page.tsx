import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ExpensesClient } from "./ExpensesClient";

export interface Expense {
  id: string;
  school_id: string;
  title: string;
  description?: string | null;
  amount: number;
  expense_date: string;
  category_id?: string | null;
  category_name?: string | null;
  supplier?: string | null;
  payment_method?: string | null;
  reference_number?: string | null;
  department?: string | null;
  status: "pending" | "approved" | "rejected" | "changes_requested" | "voided";
  created_by?: string | null;
  created_by_name?: string | null;
  approved_by?: string | null;
  approved_by_name?: string | null;
  approval_note?: string | null;  // maps to rejection_reason in DB
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
}

export default async function ExpensesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || !["owner", "headmaster", "accountant"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const schoolId = profile.school_id as string;

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const isMissing = (e: { code?: string; message?: string } | null) =>
    e?.code === "42P01" || e?.message?.includes("does not exist");

  const [expensesRes, categoriesRes] = await Promise.all([
    admin.from("expenses")
      .select("id, school_id, title, description, amount, expense_date, category_id, supplier, payment_method, reference_number, department, status, created_by, approved_by, rejection_reason, created_at, expense_categories(name)")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(200),
    admin.from("expense_categories")
      .select("id, name")
      .or(`school_id.is.null,school_id.eq.${schoolId}`)
      .order("name"),
  ]);

  const tableNotReady: boolean = !!(isMissing(expensesRes.error) || isMissing(categoriesRes.error));

  // Resolve profile names
  let profileMap: Record<string, string> = {};
  if (!tableNotReady && (expensesRes.data ?? []).length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ids = [...new Set((expensesRes.data as any[]).flatMap((e) => [e.created_by, e.approved_by]).filter(Boolean))];
    if (ids.length > 0) {
      const { data: ps } = await admin.from("profiles").select("id, full_name").in("id", ids);
      profileMap = Object.fromEntries((ps ?? []).map((p) => [p.id, p.full_name]));
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expenses: Expense[] = tableNotReady ? [] : (expensesRes.data as any[]).map((e) => ({
    id: e.id,
    school_id: e.school_id,
    title: e.title,
    description: e.description,
    amount: Number(e.amount),
    expense_date: e.expense_date,
    category_id: e.category_id,
    category_name: e.expense_categories?.name ?? null,
    supplier: e.supplier,
    payment_method: e.payment_method,
    reference_number: e.reference_number,
    department: e.department,
    status: e.status,
    created_by: e.created_by,
    created_by_name: e.created_by ? (profileMap[e.created_by] ?? null) : null,
    approved_by: e.approved_by,
    approved_by_name: e.approved_by ? (profileMap[e.approved_by] ?? null) : null,
    approval_note: e.rejection_reason,
    created_at: e.created_at,
  }));

  const categories: Category[] = tableNotReady ? [] : (categoriesRes.data ?? []).map((c) => ({ id: c.id, name: c.name }));

  return (
    <ExpensesClient
      schoolId={schoolId}
      role={profile.role}
      userName={profile.full_name ?? ""}
      initialExpenses={expenses}
      initialCategories={categories}
      tableNotReady={tableNotReady}
    />
  );
}
