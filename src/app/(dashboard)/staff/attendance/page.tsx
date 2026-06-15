import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StaffAttendanceClient } from "./StaffAttendanceClient";

export default async function StaffAttendancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("school_id, role").eq("id", user.id).single();
  if (!profile?.school_id) redirect("/dashboard");

  const schoolId = profile.school_id as string;
  const isAdmin = ["owner", "headmaster", "accountant", "admin"].includes(profile.role);

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const today = new Date().toISOString().split("T")[0];

  const isMissing = (e: { code?: string; message?: string } | null) =>
    e?.code === "42P01" || e?.message?.includes("does not exist");

  const [staffRes, todayAttRes] = await Promise.all([
    admin.from("profiles")
      .select("id, full_name, role")
      .eq("school_id", schoolId)
      .neq("id", user.id)
      .neq("role", "parent")
      .eq("is_active", true)
      .order("full_name"),
    admin.from("staff_attendance_records")
      .select("id, profile_id, status, check_in, check_out, note")
      .eq("school_id", schoolId)
      .eq("date", today),
  ]);

  const tableNotReady = !!isMissing(todayAttRes.error);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const staff = (staffRes.data ?? []).map((s: any) => ({
    id: s.id as string,
    full_name: s.full_name as string,
    role: s.role as string,
  }));

  const attMap: Record<string, { id: string; status: string; check_in?: string; check_out?: string; note?: string }> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (todayAttRes.data ?? []).forEach((a: any) => {
    attMap[a.profile_id] = { id: a.id, status: a.status, check_in: a.check_in, check_out: a.check_out, note: a.note };
  });

  return (
    <StaffAttendanceClient
      schoolId={schoolId}
      userId={user.id}
      role={profile.role}
      isAdmin={isAdmin}
      staff={staff}
      initialAttMap={attMap}
      today={today}
      tableNotReady={tableNotReady}
    />
  );
}
