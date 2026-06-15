import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, school_id, username")
    .eq("id", user.id)
    .single();

  if (!profile?.school_id) {
    return <DashboardClient profile={profile} school={null} stats={null} />;
  }

  const [
    schoolRes,
    { count: totalStudents },
    { count: activeStudents },
    { count: totalStaff },
    attendanceTodayRes,
    feeDataRes,
    academicYearRes,
    enrollmentRes,
    termsRes,
    eventsRes,
  ] = await Promise.all([
    supabase.from("schools").select("id, name, logo_url, address, phone").eq("id", profile.school_id).single(),
    supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", profile.school_id),
    supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", profile.school_id).eq("status", "active"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("school_id", profile.school_id).neq("role", "parent"),
    supabase.from("attendance_records").select("status").eq("school_id", profile.school_id).eq("date", new Date().toISOString().split("T")[0]),
    supabase.from("fee_payments").select("amount, status").eq("school_id", profile.school_id),
    supabase.from("academic_years").select("id, name, is_current, current_term").eq("school_id", profile.school_id).eq("is_current", true).single(),
    supabase.from("students").select("classrooms(level)").eq("school_id", profile.school_id).eq("status", "active"),
    supabase.from("terms").select("id, name, start_date, end_date, reopening_date").eq("school_id", profile.school_id).order("start_date"),
    supabase.from("school_events").select("id, title, event_date, color, description").eq("school_id", profile.school_id).gte("event_date", new Date().toISOString().split("T")[0]).order("event_date").limit(10),
  ]);

  const attendanceToday = attendanceTodayRes.data ?? [];
  const feeData = feeDataRes.data ?? [];
  const academicYear = academicYearRes.data;

  const presentToday = attendanceToday.filter((r) => r.status === "present").length;
  const absentToday = attendanceToday.filter((r) => r.status === "absent").length;
  const totalToday = attendanceToday.length || 1;

  const totalCollected = feeData.filter((f) => f.status === "paid").reduce((s, f) => s + (f.amount ?? 0), 0);
  const totalOutstanding = feeData.filter((f) => f.status !== "paid").reduce((s, f) => s + (f.amount ?? 0), 0);

  // Enrollment by level from real data
  const levelOrder = ["daycare", "nursery", "kg", "primary", "jhs"];
  const levelLabels: Record<string, string> = { daycare: "Day Care", nursery: "Nursery", kg: "KG", primary: "Primary", jhs: "JHS" };
  const levelCounts: Record<string, number> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (enrollmentRes.data ?? []).forEach((s: any) => {
    const level = s.classrooms?.level;
    if (level) levelCounts[level] = (levelCounts[level] ?? 0) + 1;
  });
  const enrollmentByLevel = levelOrder
    .filter((l) => levelCounts[l] > 0)
    .map((l) => ({ level: levelLabels[l] ?? l, count: levelCounts[l] }));

  const stats = {
    totalStudents: totalStudents ?? 0,
    activeStudents: activeStudents ?? 0,
    totalStaff: totalStaff ?? 0,
    presentToday,
    absentToday,
    attendanceRate: Math.round((presentToday / totalToday) * 100),
    totalCollected,
    totalOutstanding,
    academicYear: academicYear?.name ?? null,
    currentTerm: academicYear?.current_term ?? null,
    enrollmentByLevel,
    terms: termsRes.data ?? [],
    events: eventsRes.data ?? [],
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <DashboardClient profile={profile} school={schoolRes.data} stats={stats as any} />;
}
