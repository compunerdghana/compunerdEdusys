import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ExitsClient } from "./ExitsClient";

export default async function ExitsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("school_id, role").eq("id", user.id).single();
  if (!profile?.school_id || !["owner", "headmaster"].includes(profile.role)) redirect("/dashboard");
  const schoolId = profile.school_id as string;

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const isMissing = (e: { code?: string; message?: string } | null) =>
    e?.code === "42P01" || e?.message?.includes("does not exist");

  const [exitsRes, staffRes] = await Promise.all([
    admin.from("staff_exit_records")
      .select("id, profile_id, exit_type, exit_date, notice_date, last_working_day, reason, clearance_status, handover_notes, created_at")
      .eq("school_id", schoolId).order("exit_date", { ascending: false }).limit(200),
    admin.from("profiles").select("id, full_name, is_active").eq("school_id", schoolId).neq("role", "parent").order("full_name"),
  ]);

  const tableNotReady = !!isMissing(exitsRes.error);
  const staffMap = Object.fromEntries((staffRes.data ?? []).map((s) => [s.id, { name: s.full_name, is_active: s.is_active }]));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const records = tableNotReady ? [] : (exitsRes.data ?? []).map((r: any) => ({
    ...r, staff_name: staffMap[r.profile_id]?.name ?? "Unknown",
  }));

  // Only active staff can exit
  const activeStaff = (staffRes.data ?? []).filter((s) => s.is_active !== false);

  return (
    <ExitsClient
      schoolId={schoolId}
      userId={user.id}
      staff={activeStaff}
      initialRecords={records}
      tableNotReady={tableNotReady}
    />
  );
}
