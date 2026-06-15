import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { StudentsClient } from "./StudentsClient";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; class?: string; view?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("school_id, role").eq("id", user.id).single();
  const schoolId = profile?.school_id;
  if (!schoolId) redirect("/settings/school");

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const isMissing = (e: { code?: string; message?: string } | null) =>
    e?.code === "42P01" || e?.message?.includes("does not exist");

  const [studentsRes, classesRes, attendanceRes, feesRes] = await Promise.all([
    (() => {
      let q = admin
        .from("students")
        .select("*, classrooms(name, level)")
        .eq("school_id", schoolId)
        .order("last_name");
      if (params.q) q = q.or(`first_name.ilike.%${params.q}%,last_name.ilike.%${params.q}%,admission_number.ilike.%${params.q}%`);
      if (params.status) q = q.eq("status", params.status);
      if (params.class) q = q.eq("class_id", params.class);
      return q;
    })(),
    admin.from("classrooms").select("id, name, level").eq("school_id", schoolId).order("level").order("name"),
    admin.from("attendance_records").select("student_id, status, date")
      .eq("school_id", schoolId)
      .eq("date", new Date().toISOString().split("T")[0]).limit(500),
    admin.from("fee_payments").select("student_id, balance")
      .eq("school_id", schoolId).gt("balance", 0).limit(500),
  ]);

  const allStudents = studentsRes.data ?? [];
  const todayAttendance = isMissing(attendanceRes.error) ? [] : (attendanceRes.data ?? []);
  const outstandingFees = isMissing(feesRes.error) ? [] : (feesRes.data ?? []);

  const today = new Date().toISOString().split("T")[0];
  const thisMonth = today.slice(0, 7);

  const stats = {
    total: allStudents.length,
    active: allStudents.filter(s => s.status === "active").length,
    male: allStudents.filter(s => s.gender === "male").length,
    female: allStudents.filter(s => s.gender === "female").length,
    newThisMonth: allStudents.filter(s => s.admission_date?.startsWith(thisMonth)).length,
    presentToday: todayAttendance.filter(a => a.status === "present").length,
    absentToday: todayAttendance.filter(a => a.status === "absent").length,
    outstandingFees: new Set(outstandingFees.map(f => f.student_id)).size,
  };

  return (
    <StudentsClient
      students={allStudents}
      classes={classesRes.data ?? []}
      schoolId={schoolId}
      filters={params}
      role={profile?.role ?? "teacher"}
      stats={stats}
    />
  );
}
