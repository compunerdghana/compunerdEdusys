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

    // Fetch leave requests for this teacher
    const { data: requests, error: reqErr } = await supabase
      .from("staff_leave_requests")
      .select("*")
      .eq("school_id", profile.school_id)
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false });

    if (reqErr) throw reqErr;

    // Fetch available leave types
    const { data: types, error: typeErr } = await supabase
      .from("staff_leave_types")
      .select("id, name, max_days, is_paid")
      .or(`school_id.is.null,school_id.eq.${profile.school_id}`)
      .order("name");

    return NextResponse.json({
      requests: requests ?? [],
      leaveTypes: types ?? []
    });
  } catch (err) {
    console.error("Leave request GET error:", err);
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
    const { leave_type_id, leave_type_name, start_date, end_date, days_requested, reason } = body;

    if (!start_date || !end_date || !days_requested) {
      return NextResponse.json({ error: "Missing required leave fields" }, { status: 400 });
    }

    // Securely force profile_id and school_id from authenticated session
    const { data: leaveRequest, error } = await supabase
      .from("staff_leave_requests")
      .insert({
        school_id: profile.school_id,
        profile_id: user.id,
        leave_type_id: leave_type_id || null,
        leave_type_name: leave_type_name || "Annual Leave",
        start_date,
        end_date,
        days_requested: parseInt(days_requested) || 1,
        reason: reason || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, request: leaveRequest });
  } catch (err) {
    console.error("Leave request POST error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
