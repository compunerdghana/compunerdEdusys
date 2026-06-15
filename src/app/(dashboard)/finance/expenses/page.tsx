import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ExpensesClient } from "./ExpensesClient";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export default async function ExpensesPage() {
  const supabase = await createServerClient();
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

  // Direct Supabase queries — no self-fetch
  const [expensesRes, categoriesRes] = await Promise.all([
    admin
      .from("expenses")
      .select("*, expense_categories(id, name)")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("expense_categories")
      .select("id, name")
      .or(`school_id.is.null,school_id.eq.${schoolId}`)
      .order("name"),
  ]);

  const tableNotReady =
    (expensesRes.error?.code === "42P01" || expensesRes.error?.message?.includes("does not exist")) ||
    (categoriesRes.error?.code === "42P01" || categoriesRes.error?.message?.includes("does not exist"));

  // Fetch creator/approver names from profiles separately
  let profileMap: Record<string, string> = {};
  if (!tableNotReady && expensesRes.data && expensesRes.data.length > 0) {
    const userIds = [...new Set([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...expensesRes.data.map((e: any) => e.created_by).filter(Boolean),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...expensesRes.data.map((e: any) => e.approved_by).filter(Boolean),
    ])];
    if (userIds.length > 0) {
      const { data: profiles } = await admin.from("profiles").select("id, full_name").in("id", userIds);
      profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p.full_name]));
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expenses: Expense[] = tableNotReady ? [] : (expensesRes.data ?? []).map((e: any) => ({
    ...e,
    category: e.expense_categories ?? null,
    created_by_name: e.created_by ? (profileMap[e.created_by] ?? null) : null,
    approved_by_name: e.approved_by ? (profileMap[e.approved_by] ?? null) : null,
  }));

  const categories: Category[] = tableNotReady ? [] : (categoriesRes.data ?? []);

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

export interface Expense {
  id: string;
  school_id: string;
  title: string;
  description?: string | null;
  amount: number;
  expense_date: string;
  category_id?: string | null;
  category?: { id: string; name: string } | null;
  supplier?: string | null;
  payment_method?: string | null;
  reference_number?: string | null;
  department?: string | null;
  branch?: string | null;
  status: "pending" | "approved" | "rejected" | "changes_requested" | "voided";
  created_by?: string | null;
  created_by_name?: string | null;
  approved_by?: string | null;
  approved_by_name?: string | null;
  approval_note?: string | null;
  attachments?: string[] | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  school_id: string | null;
}
