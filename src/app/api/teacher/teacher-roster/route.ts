import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id, role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "teacher" && profile.role !== "super_admin")) {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }

    // 1. Get assigned classrooms
    const { data: classesRes } = await supabase
      .from("staff_assigned_classes")
      .select("class_id, classrooms(id, name, level)")
      .eq("profile_id", user.id);

    const classrooms = (classesRes ?? [])
      .map((c: any) => c.classrooms)
      .filter(Boolean);

    // 2. Get assigned subjects
    const { data: subjectsRes } = await supabase
      .from("staff_assigned_subjects")
      .select("subject_id, subjects(id, name)")
      .eq("profile_id", user.id);

    const subjects = (subjectsRes ?? [])
      .map((s: any) => s.subjects)
      .filter(Boolean);

    // 3. Get students in these classrooms
    const classIds = (classesRes ?? []).map((c: any) => c.class_id).filter(Boolean);
    let students: any[] = [];
    
    if (classIds.length > 0) {
      const { data: studentsRes } = await supabase
        .from("students")
        .select("id, first_name, last_name, admission_number, student_id, class_id")
        .in("class_id", classIds)
        .eq("status", "active")
        .order("first_name");
      
      students = studentsRes ?? [];
    }

    return NextResponse.json({
      classrooms,
      subjects,
      students
    });
  } catch (err) {
    console.error("Teacher roster fetching error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
