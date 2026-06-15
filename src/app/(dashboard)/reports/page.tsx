import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReportsClient } from "./ReportsClient";

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.school_id) redirect("/settings/school");
  const schoolId = profile.school_id;

  // Parallel fetches — graceful fallback on any error
  const [
    schoolRes,
    classesRes,
    studentsRes,
    termsRes,
    currentTermRes,
    staffRes,
    walletsRes,
    receiptsRes,
    attendanceRes,
  ] = await Promise.all([
    supabase
      .from("schools")
      .select("id, name, address, logo_url, headmaster_signature_url, motto")
      .eq("id", schoolId)
      .single(),
    supabase
      .from("classrooms")
      .select("id, name, level")
      .eq("school_id", schoolId)
      .order("level")
      .order("name"),
    supabase
      .from("students")
      .select("id, admission_number, first_name, last_name, gender, status, class_id, classrooms!inner(id, name, level)")
      .eq("school_id", schoolId)
      .order("last_name"),
    supabase
      .from("terms")
      .select("id, name, start_date, end_date, is_current")
      .eq("school_id", schoolId)
      .order("start_date", { ascending: false }),
    supabase
      .from("terms")
      .select("id, name")
      .eq("school_id", schoolId)
      .eq("is_current", true)
      .single(),
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("school_id", schoolId)
      .neq("role", "student"),
    supabase
      .from("student_wallets")
      .select("student_id, total_billed, total_paid, total_waived")
      .eq("school_id", schoolId),
    supabase
      .from("payment_receipts")
      .select("id, student_id, amount, created_at")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(500),
    // attendance_records may not exist — catch gracefully below
    supabase
      .from("attendance_records")
      .select("student_id, status, date")
      .eq("school_id", schoolId),
  ]);

  const school = schoolRes.data ?? null;
  const classes = classesRes.data ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const students = (studentsRes.data ?? []).map((s: any) => ({
    ...s,
    classrooms: Array.isArray(s.classrooms) ? s.classrooms[0] ?? null : s.classrooms,
  }));
  const terms = termsRes.data ?? [];
  const currentTermId = currentTermRes.data?.id ?? null;
  const staff = staffRes.data ?? [];
  const wallets = walletsRes.data ?? [];
  const receipts = receiptsRes.data ?? [];
  // If attendance table doesn't exist, error is set — use empty array
  const attendanceRecords = attendanceRes.error ? [] : (attendanceRes.data ?? []);

  return (
    <ReportsClient
      school={school}
      classes={classes}
      students={students}
      terms={terms}
      currentTermId={currentTermId}
      staff={staff}
      wallets={wallets}
      receipts={receipts}
      attendanceRecords={attendanceRecords}
    />
  );
}
