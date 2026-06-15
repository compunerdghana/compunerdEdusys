import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StaffDashboardClient } from "./StaffDashboardClient";

export default async function StaffDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.school_id) redirect("/dashboard");
  const schoolId = profile.school_id as string;

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const today = new Date().toISOString().split("T")[0];
  const monthStart = today.slice(0, 8) + "01";

  const [allStaffRes, detailsRes, todayAttRes, leaveRes, newStaffRes] = await Promise.all([
    admin.from("profiles")
      .select("id, full_name, role, is_active, created_at")
      .eq("school_id", schoolId)
      .neq("id", user.id)
      .neq("role", "parent"),
    admin.from("staff_details")
      .select("profile_id, staff_category, department, gender")
      .eq("school_id", schoolId),
    admin.from("staff_attendance_records")
      .select("profile_id, status")
      .eq("school_id", schoolId)
      .eq("date", today),
    admin.from("staff_leave_requests")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("status", "approved")
      .lte("start_date", today)
      .gte("end_date", today),
    admin.from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .gte("created_at", monthStart)
      .neq("role", "parent"),
  ]);

  const isMissing = (e: { code?: string; message?: string } | null) =>
    e?.code === "42P01" || e?.message?.includes("does not exist");

  const tableNotReady = !!isMissing(detailsRes.error);

  const allStaff = allStaffRes.data ?? [];
  const details = detailsRes.data ?? [];
  const todayAtt = todayAttRes.data ?? [];

  const detailMap = Object.fromEntries(details.map((d) => [d.profile_id, d]));

  const staffList = allStaff.map((s) => ({
    id: s.id,
    full_name: s.full_name,
    role: s.role,
    is_active: s.is_active,
    created_at: s.created_at,
    ...(detailMap[s.id] ?? {}),
  }));

  const academicRoles = ["headmaster", "teacher"];
  const adminRoles = ["accountant", "secretary", "receptionist"];

  const totals = {
    total: staffList.length,
    academic: staffList.filter((s) => academicRoles.includes(s.role)).length,
    admin: staffList.filter((s) => adminRoles.includes(s.role)).length,
    support: staffList.filter((s) => !academicRoles.includes(s.role) && !adminRoles.includes(s.role)).length,
    present: todayAtt.filter((a) => a.status === "present" || a.status === "late").length,
    absent: todayAtt.filter((a) => a.status === "absent").length,
    onLeave: leaveRes.count ?? 0,
    newThisMonth: newStaffRes.count ?? 0,
    male: details.filter((d) => d.gender?.toLowerCase() === "male").length,
    female: details.filter((d) => d.gender?.toLowerCase() === "female").length,
  };

  // Department distribution
  const deptMap: Record<string, number> = {};
  details.forEach((d) => {
    if (d.department) deptMap[d.department] = (deptMap[d.department] ?? 0) + 1;
  });

  // Role distribution
  const roleMap: Record<string, number> = {};
  staffList.forEach((s) => {
    const role = s.role ?? "other";
    roleMap[role] = (roleMap[role] ?? 0) + 1;
  });

  return (
    <StaffDashboardClient
      schoolId={schoolId}
      role={profile.role}
      totals={totals}
      deptDistribution={deptMap}
      roleDistribution={roleMap}
      tableNotReady={tableNotReady}
    />
  );
}
