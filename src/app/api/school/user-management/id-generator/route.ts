import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getAdmin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .single();

    const schoolId = profile?.school_id;
    if (!schoolId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const roleType = searchParams.get("role_type") || "student";
    const increment = searchParams.get("increment") === "true";

    const admin = getAdmin();

    // 1. Get school code and format template
    const { data: school } = await admin
      .from("schools")
      .select("code, id_format_student, id_format_teacher, id_format_staff, id_format_parent, id_format_admin")
      .eq("id", schoolId)
      .single();

    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    const schoolCode = school.code || "SCH";
    
    // Resolve format template
    let template = "CPN/{school_code}/{year}/STU{seq}";
    if (roleType === "student") template = school.id_format_student || "CPN/{school_code}/{year}/STU{seq}";
    else if (roleType === "teacher") template = school.id_format_teacher || "CPN/{school_code}/{year}/TCH{seq}";
    else if (roleType === "parent") template = school.id_format_parent || "CPN/{school_code}/{year}/PAR{seq}";
    else if (roleType === "staff") template = school.id_format_staff || "CPN/{school_code}/{year}/STF{seq}";
    else template = school.id_format_admin || "CPN/{school_code}/{year}/ADM{seq}";

    // 2. Fetch current academic year
    const { data: acadYear } = await admin
      .from("academic_years")
      .select("id, name")
      .eq("school_id", schoolId)
      .eq("is_current", true)
      .maybeSingle();

    const acadYearId = acadYear?.id || null;
    let yearStr = new Date().getFullYear().toString().slice(-2);
    if (acadYear?.name) {
      // e.g. "2026/2027" -> "26"
      const match = acadYear.name.match(/\b\d{4}\b/);
      if (match) yearStr = match[0].slice(-2);
    }

    // 3. Retrieve or create sequence row
    let nextValue = 1;
    const { data: sequence, error: seqErr } = await admin
      .from("school_id_sequences")
      .select("id, last_value")
      .eq("school_id", schoolId)
      .eq("role_type", roleType)
      .single();

    if (seqErr || !sequence) {
      // Insert sequence row
      if (increment) {
        await admin.from("school_id_sequences").insert({
          school_id: schoolId,
          role_type: roleType,
          academic_year_id: acadYearId,
          last_value: 1
        });
      }
      nextValue = 1;
    } else {
      nextValue = sequence.last_value + 1;
      if (increment) {
        await admin
          .from("school_id_sequences")
          .update({ last_value: nextValue })
          .eq("id", sequence.id);
      }
    }

    // Replace template format variables
    const formattedId = template
      .replace(/{school_code}/g, schoolCode.toUpperCase())
      .replace(/{year}/g, yearStr)
      .replace(/{seq}/g, String(nextValue).padStart(4, "0"));

    return NextResponse.json({ id: formattedId, sequence: nextValue });
  } catch (err) {
    console.error("ID Generator error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
