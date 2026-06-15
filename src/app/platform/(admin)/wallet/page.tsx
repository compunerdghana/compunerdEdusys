import { createClient as createAdmin } from "@supabase/supabase-js";
import { WalletClient } from "./WalletClient";

export default async function WalletPage() {
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const [{ data: transactions }, { data: schools }] = await Promise.all([
    admin
      .from("platform_transactions")
      .select(`*, schools ( id, name )`)
      .order("created_at", { ascending: false }),
    admin.from("schools").select("id, name").eq("status", "active").order("name"),
  ]);

  const income = (transactions ?? []).filter(t => t.type === "income").reduce((s, t) => s + (t.amount ?? 0), 0);
  const expenses = (transactions ?? []).filter(t => t.type === "expense").reduce((s, t) => s + (t.amount ?? 0), 0);
  const balance = income - expenses;

  return (
    <WalletClient
      transactions={transactions ?? []}
      schools={schools ?? []}
      balance={balance}
      totalIncome={income}
      totalExpenses={expenses}
    />
  );
}
