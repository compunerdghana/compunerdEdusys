import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReportsClient } from "./ReportsClient";

function getAdmin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.school_id) redirect("/settings/school");
  const schoolId = profile.school_id;
  const admin = getAdmin();

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
    expensesRes,
    incomeRes,
    examResultsRes,
    commLogsRes,
    payrollRunsRes,
    admissionsRes,
  ] = await Promise.all([
    admin.from("schools")
      .select("id, name, address, logo_url, headmaster_signature_url, motto, phone")
      .eq("id", schoolId).single(),

    admin.from("classrooms")
      .select("id, name, level")
      .eq("school_id", schoolId)
      .order("level").order("name"),

    admin.from("students")
      .select("id, admission_number, first_name, last_name, gender, status, class_id, date_of_birth, classrooms!inner(id, name, level)")
      .eq("school_id", schoolId)
      .order("last_name"),

    admin.from("terms")
      .select("id, name, start_date, end_date, is_current")
      .eq("school_id", schoolId)
      .order("start_date", { ascending: false }),

    admin.from("terms")
      .select("id, name")
      .eq("school_id", schoolId)
      .eq("is_current", true)
      .maybeSingle(),

    admin.from("profiles")
      .select("id, full_name, role, email, phone, created_at, staff_details(department, designation, basic_salary, allowances, employment_type, qualification)")
      .eq("school_id", schoolId)
      .neq("role", "parent")
      .neq("role", "student")
      .eq("is_active", true)
      .order("full_name"),

    admin.from("student_wallets")
      .select("student_id, total_billed, total_paid, total_waived")
      .eq("school_id", schoolId),

    admin.from("payment_receipts")
      .select("id, student_id, amount, payment_method, created_at")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(1000),

    admin.from("attendance_records")
      .select("student_id, status, date")
      .eq("school_id", schoolId),

    admin.from("expenses")
      .select("id, title, amount, category, date, paid_by")
      .eq("school_id", schoolId)
      .order("date", { ascending: false })
      .limit(500),

    admin.from("income_records")
      .select("id, title, amount, category, date")
      .eq("school_id", schoolId)
      .order("date", { ascending: false })
      .limit(500),

    admin.from("exam_results")
      .select("id, student_id, subject, score, grade, class_id, term_id")
      .eq("school_id", schoolId)
      .limit(2000),

    admin.from("communication_logs")
      .select("id, channel, status, recipient_count, sent_at")
      .eq("school_id", schoolId)
      .order("sent_at", { ascending: false })
      .limit(500),

    admin.from("payroll_runs")
      .select("id, month, year, status, total_gross, total_net, total_deductions")
      .eq("school_id", schoolId)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(12),

    admin.from("students")
      .select("id, created_at, status")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false }),
  ]);

  const isMissing = (e: { code?: string; message?: string } | null) =>
    e?.code === "42P01" || e?.message?.includes("does not exist");

  const school = schoolRes.data ?? null;
  const classes = classesRes.data ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const students = (studentsRes.data ?? []).map((s: any) => ({
    ...s,
    classrooms: Array.isArray(s.classrooms) ? s.classrooms[0] ?? null : s.classrooms,
  }));
  const terms = termsRes.data ?? [];
  const currentTermId = currentTermRes.data?.id ?? null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const staff = (staffRes.data ?? []).map((s: any) => ({
    ...s,
    staff_details: Array.isArray(s.staff_details) ? s.staff_details[0] ?? null : s.staff_details,
  }));
  const wallets = walletsRes.data ?? [];
  const receipts = receiptsRes.data ?? [];
  const attendanceRecords = isMissing(attendanceRes.error) ? [] : (attendanceRes.data ?? []);
  const expenses = isMissing(expensesRes.error) ? [] : (expensesRes.data ?? []);
  const incomeRecords = isMissing(incomeRes.error) ? [] : (incomeRes.data ?? []);
  const examResults = isMissing(examResultsRes.error) ? [] : (examResultsRes.data ?? []);
  const commLogs = isMissing(commLogsRes.error) ? [] : (commLogsRes.data ?? []);
  const payrollRuns = isMissing(payrollRunsRes.error) ? [] : (payrollRunsRes.data ?? []);
  const admissions = admissionsRes.data ?? [];

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
      expenses={expenses}
      incomeRecords={incomeRecords}
      examResults={examResults}
      commLogs={commLogs}
      payrollRuns={payrollRuns}
      admissions={admissions}
    />
  );
}
