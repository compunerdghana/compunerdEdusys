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

    const admin = getAdmin();
    const { data: links, error } = await admin
      .from("parent_student_links")
      .select(`
        id,
        relationship,
        is_primary,
        created_at,
        parent:parents ( id, parent_id, full_name, phone, email ),
        student:students ( id, student_id, first_name, last_name, admission_number )
      `)
      .eq("parent.school_id", schoolId);

    if (error) throw error;

    // Filter out rows where parent school_id mapping didn't match (PostgREST left join mapping)
    const filtered = (links ?? []).filter((l: any) => l.parent !== null);

    return NextResponse.json({ links: filtered });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const admin = getAdmin();
    const body = await request.json();
    const { parent_id, student_id, relationship, is_primary } = body;

    if (!parent_id || !student_id) {
      return NextResponse.json({ error: "parent_id and student_id are required" }, { status: 400 });
    }

    // Tenant check
    const { data: parent } = await admin.from("parents").select("school_id").eq("id", parent_id).single();
    const { data: student } = await admin.from("students").select("school_id").eq("id", student_id).single();

    if (!parent || !student || parent.school_id !== schoolId || student.school_id !== schoolId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { data: link, error } = await admin
      .from("parent_student_links")
      .insert({
        parent_id,
        student_id,
        relationship: relationship || "Guardian",
        is_primary: !!is_primary
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ link });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Link ID is required" }, { status: 400 });

    const admin = getAdmin();
    
    // Check tenant association of link before deleting
    const { data: link } = await admin
      .from("parent_student_links")
      .select(`
        parent:parents ( school_id )
      `)
      .eq("id", id)
      .single();

    const parentObj = link?.parent;
    const parentSchoolId = Array.isArray(parentObj)
      ? parentObj[0]?.school_id
      : (parentObj as any)?.school_id;

    if (!link || parentSchoolId !== schoolId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { error } = await admin.from("parent_student_links").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
