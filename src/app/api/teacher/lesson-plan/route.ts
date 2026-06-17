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

    if (!profile) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

    // Fetch lesson plans
    const { data: plans, error: planErr } = await supabase
      .from("teacher_lesson_notes")
      .select(`
        id,
        week_number,
        academic_year,
        topic,
        objectives,
        activities,
        assessment_strategy,
        status,
        remarks,
        created_at,
        classroom:classrooms(id, name),
        subject:subjects(id, name)
      `)
      .eq("school_id", profile.school_id)
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });

    // Allow graceful fallback if table is not migrated yet
    if (planErr && (planErr.message.includes("does not exist") || planErr.code === "PGRST205")) {
      return NextResponse.json({ plans: [], tableNotReady: true });
    }
    if (planErr) throw planErr;

    return NextResponse.json({ plans: plans ?? [] });
  } catch (err) {
    console.error("Lesson plan GET error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id, role")
      .eq("id", user.id)
      .single();

    if (!profile) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

    const body = await req.json();
    const { week_number, academic_year, subject_id, class_id, topic, objectives, activities, assessment_strategy, status } = body;

    if (!week_number || !academic_year || !topic) {
      return NextResponse.json({ error: "Missing required fields (week, year, topic)" }, { status: 400 });
    }

    const { data: plan, error } = await supabase
      .from("teacher_lesson_notes")
      .insert({
        school_id: profile.school_id,
        teacher_id: user.id,
        week_number: parseInt(week_number) || 1,
        academic_year,
        subject_id: subject_id || null,
        class_id: class_id || null,
        topic,
        objectives: objectives || null,
        activities: activities || null,
        assessment_strategy: assessment_strategy || null,
        status: status || "draft",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, plan });
  } catch (err) {
    console.error("Lesson plan POST error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id, role")
      .eq("id", user.id)
      .single();

    if (!profile) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

    const body = await req.json();
    const { id, week_number, academic_year, subject_id, class_id, topic, objectives, activities, assessment_strategy, status } = body;

    if (!id) return NextResponse.json({ error: "Lesson note ID is required" }, { status: 400 });

    const { data: plan, error } = await supabase
      .from("teacher_lesson_notes")
      .update({
        week_number: week_number !== undefined ? parseInt(week_number) : undefined,
        academic_year,
        subject_id: subject_id !== undefined ? (subject_id || null) : undefined,
        class_id: class_id !== undefined ? (class_id || null) : undefined,
        topic,
        objectives,
        activities,
        assessment_strategy,
        status,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("teacher_id", user.id) // security check
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, plan });
  } catch (err) {
    console.error("Lesson plan PATCH error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
