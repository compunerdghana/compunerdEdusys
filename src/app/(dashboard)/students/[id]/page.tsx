import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { StudentProfile } from "./StudentProfile";

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: viewer } = await supabase.from("profiles").select("school_id, role, id").eq("id", user.id).single();
  if (!viewer?.school_id) redirect("/dashboard");

  const [
    studentRes,
    parentsRes,
    feesRes,
    attendanceRes,
    scoresRes,
    classesRes,
    medicalRes,
    docsRes,
    disciplineRes,
    awardsRes,
    promotionsRes,
    timelineRes,
    walletRes,
    invoicesRes,
  ] = await Promise.all([
    supabase.from("students").select("*, classrooms(id, name, level)").eq("id", id).eq("school_id", viewer.school_id).single(),
    supabase.from("parents").select("*").eq("student_id", id).order("is_primary", { ascending: false }),
    supabase.from("fee_payments").select("*, fee_types(name), terms(name)").eq("student_id", id).order("created_at", { ascending: false }),
    supabase.from("attendance_records").select("date, status, terms(name)").eq("student_id", id).order("date", { ascending: false }),
    supabase.from("exam_scores").select("*, subjects(name), terms(name)").eq("student_id", id).order("created_at", { ascending: false }),
    supabase.from("classrooms").select("id, name, level").eq("school_id", viewer.school_id).order("name"),
    supabase.from("student_medical").select("*").eq("student_id", id).maybeSingle(),
    supabase.from("student_documents").select("*").eq("student_id", id).order("uploaded_at", { ascending: false }),
    supabase.from("student_discipline").select("*").eq("student_id", id).order("incident_date", { ascending: false }),
    supabase.from("student_awards").select("*").eq("student_id", id).order("awarded_date", { ascending: false }),
    supabase.from("student_promotions").select("*").eq("student_id", id).order("created_at"),
    supabase.from("student_timeline").select("*").eq("student_id", id).order("event_date", { ascending: false }),
    supabase.from("student_wallets").select("*").eq("student_id", id).maybeSingle(),
    supabase.from("student_invoices").select("*, student_invoice_lines(*)").eq("student_id", id).order("created_at", { ascending: false }),
  ]);

  if (!studentRes.data) notFound();

  return (
    <StudentProfile
      student={studentRes.data}
      parents={parentsRes.data ?? []}
      fees={feesRes.data ?? []}
      attendance={(attendanceRes.data ?? []) as never}
      scores={scoresRes.data ?? []}
      classes={classesRes.data ?? []}
      medical={medicalRes.data ?? null}
      documents={docsRes.data ?? []}
      discipline={disciplineRes.data ?? []}
      awards={awardsRes.data ?? []}
      promotions={promotionsRes.data ?? []}
      timeline={timelineRes.data ?? []}
      wallet={walletRes.data ?? null}
      invoices={invoicesRes.data ?? []}
      viewerRole={viewer.role}
      viewerId={viewer.id}
    />
  );
}
