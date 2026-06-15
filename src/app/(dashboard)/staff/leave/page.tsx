import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LeaveClient } from "./LeaveClient";

export default async function StaffLeavePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("school_id, role, full_name").eq("id", user.id).single();
  if (!profile?.school_id) redirect("/dashboard");

  const schoolId = profile.school_id as string;
  const isAdmin = ["owner", "headmaster"].includes(profile.role);

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const isMissing = (e: { code?: string; message?: string } | null) =>
    e?.code === "42P01" || e?.message?.includes("does not exist");

  const [typesRes, requestsRes, staffRes] = await Promise.all([
    admin.from("staff_leave_types").select("id, name, max_days, is_paid").or(`school_id.is.null,school_id.eq.${schoolId}`).order("name"),
    isAdmin
      ? admin.from("staff_leave_requests").select("id, profile_id, leave_type_name, start_date, end_date, days_requested, reason, status, reviewed_at, reviewer_note, created_at").eq("school_id", schoolId).order("created_at", { ascending: false }).limit(200)
      : admin.from("staff_leave_requests").select("id, profile_id, leave_type_name, start_date, end_date, days_requested, reason, status, reviewed_at, reviewer_note, created_at").eq("school_id", schoolId).eq("profile_id", user.id).order("created_at", { ascending: false }),
    admin.from("profiles").select("id, full_name").eq("school_id", schoolId).neq("role", "parent").order("full_name"),
  ]);

  const tableNotReady = isMissing(requestsRes.error) || isMissing(typesRes.error);

  const staffMap = Object.fromEntries((staffRes.data ?? []).map((s) => [s.id, s.full_name]));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requests = tableNotReady ? [] : (requestsRes.data ?? []).map((r: any) => ({
    ...r,
    staff_name: staffMap[r.profile_id] ?? "Unknown",
  }));

  return (
    <LeaveClient
      schoolId={schoolId}
      userId={user.id}
      userName={profile.full_name ?? ""}
      role={profile.role}
      isAdmin={isAdmin}
      leaveTypes={tableNotReady ? [] : (typesRes.data ?? [])}
      initialRequests={requests}
      tableNotReady={tableNotReady}
    />
  );
}
