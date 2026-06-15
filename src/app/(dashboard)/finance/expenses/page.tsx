import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ExpensesClient } from "./ExpensesClient";

export default async function ExpensesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, role, full_name")
    .eq("id", user.id)
    .single();

  const allowedRoles = ["owner", "headmaster", "accountant"];
  if (!profile || !allowedRoles.includes(profile.role)) {
    redirect("/dashboard");
  }

  const schoolId = profile.school_id as string;
  const role = profile.role as string;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const [expensesRes, categoriesRes] = await Promise.all([
    fetch(`${baseUrl}/api/admin/finance/expenses?schoolId=${schoolId}`, {
      cache: "no-store",
    }),
    fetch(`${baseUrl}/api/admin/finance/categories?schoolId=${schoolId}`, {
      cache: "no-store",
    }),
  ]);

  let expenses: Expense[] = [];
  let categories: Category[] = [];
  let tableNotReady = false;

  if (expensesRes.ok) {
    const json = await expensesRes.json();
    if (json.tableNotReady) {
      tableNotReady = true;
    } else {
      expenses = json.data ?? [];
    }
  } else {
    const json = await expensesRes.json().catch(() => ({}));
    if (json.tableNotReady) tableNotReady = true;
  }

  if (!tableNotReady && categoriesRes.ok) {
    const json = await categoriesRes.json();
    categories = json.data ?? [];
  }

  return (
    <ExpensesClient
      schoolId={schoolId}
      role={role}
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
  school_id: string;
}
