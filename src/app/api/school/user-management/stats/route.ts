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

    // 1. Fetch counts
    const { data: profiles, error } = await admin
      .from("profiles")
      .select("id, role, is_active")
      .eq("school_id", schoolId)
      .neq("role", "super_admin");

    if (error) throw error;

    const totalUsers = profiles?.length || 0;
    const activeUsers = profiles?.filter(p => p.is_active).length || 0;
    const suspendedUsers = totalUsers - activeUsers;
    const teacherCount = profiles?.filter(p => p.role === "teacher").length || 0;
    const studentCount = profiles?.filter(p => p.role === "student").length || 0;
    const parentCount = profiles?.filter(p => p.role === "parent").length || 0;
    const staffCount = totalUsers - (studentCount + parentCount);

    // 2. Recently added users
    const { data: recent } = await admin
      .from("profiles")
      .select("id, full_name, role, created_at, is_active")
      .eq("school_id", schoolId)
      .neq("role", "super_admin")
      .order("created_at", { ascending: false })
      .limit(5);

    // 3. Mock data for history chart
    const chartData = [
      { name: "Mon", active: activeUsers - 2, suspended: suspendedUsers },
      { name: "Tue", active: activeUsers - 1, suspended: suspendedUsers },
      { name: "Wed", active: activeUsers, suspended: suspendedUsers },
      { name: "Thu", active: activeUsers, suspended: suspendedUsers },
      { name: "Fri", active: activeUsers, suspended: suspendedUsers },
      { name: "Sat", active: activeUsers, suspended: suspendedUsers },
      { name: "Sun", active: activeUsers, suspended: suspendedUsers }
    ];

    return NextResponse.json({
      stats: {
        totalUsers,
        activeUsers,
        suspendedUsers,
        teacherCount,
        studentCount,
        parentCount,
        staffCount
      },
      recent: recent ?? [],
      chartData
    });
  } catch (err) {
    console.error("GET user-management stats error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
