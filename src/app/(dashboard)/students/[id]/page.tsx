import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { StudentProfile } from "./StudentProfile";

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: viewer } = await supabase.from("profiles").select("school_id, role").eq("id", user.id).single();
  if (!viewer?.school_id) redirect("/dashboard");

  const [
    { data: student },
    { data: parents },
    { data: fees },
    { data: attendance },
    { data: scores },
    { data: classes },
  ] = await Promise.all([
    supabase
      .from("students")
      .select("*, classrooms(id, name, level)")
      .eq("id", id)
      .eq("school_id", viewer.school_id)
      .single(),
    supabase.from("parents").select("*").eq("student_id", id).order("is_primary", { ascending: false }),
    supabase
      .from("fee_payments")
      .select("*, fee_types(name), terms(name)")
      .eq("student_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("attendance_records")
      .select("date, status, terms(name)")
      .eq("student_id", id)
      .order("date", { ascending: false })
      .limit(60),
    supabase
      .from("exam_scores")
      .select("*, subjects(name), terms(name)")
      .eq("student_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("classrooms").select("id, name, level").eq("school_id", viewer.school_id).order("name"),
  ]);

  if (!student) notFound();

  return (
    <StudentProfile
      student={student}
      parents={parents ?? []}
      fees={fees ?? []}
      attendance={(attendance ?? []) as never}
      scores={scores ?? []}
      classes={classes ?? []}
      viewerRole={viewer.role}
    />
  );
}
