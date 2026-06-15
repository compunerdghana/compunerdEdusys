import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PayrollClient } from "./PayrollClient";

export default async function PayrollPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("school_id, role, full_name").eq("id", user.id).single();
  if (!profile?.school_id) redirect("/dashboard");
  const schoolId = profile.school_id as string;

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const isMissing = (e: { code?: string; message?: string } | null) =>
    e?.code === "42P01" || e?.message?.includes("does not exist");

  const [runsRes, staffRes] = await Promise.all([
    admin.from("payroll_runs")
      .select("*").eq("school_id", schoolId)
      .order("year", { ascending: false }).order("month", { ascending: false }),
    admin.from("profiles")
      .select("id, full_name, role, staff_details(basic_salary, allowances, department, designation)")
      .eq("school_id", schoolId).neq("role", "parent").eq("is_active", true).order("full_name"),
  ]);

  const tableNotReady = !!(isMissing(runsRes.error));

  return (
    <PayrollClient
      schoolId={schoolId}
      userId={user.id}
      userRole={profile.role}
      tableNotReady={tableNotReady}
      initialRuns={tableNotReady ? [] : (runsRes.data ?? [])}
      staffList={staffRes.data ?? []}
    />
  );
}
