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
    const { data: groups, error } = await admin
      .from("user_groups")
      .select(`
        *,
        user_group_members (
          user_id,
          profile:profiles ( id, full_name, email, role )
        )
      `)
      .eq("school_id", schoolId)
      .order("name");

    if (error) throw error;

    return NextResponse.json({ groups: groups ?? [] });
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
    const { id, name, description, user_ids } = body;

    if (!name) return NextResponse.json({ error: "Group name is required" }, { status: 400 });

    let group;
    if (id) {
      // update
      const { data, error } = await admin
        .from("user_groups")
        .update({ name, description })
        .eq("id", id)
        .eq("school_id", schoolId)
        .select()
        .single();
      if (error) throw error;
      group = data;
    } else {
      // create
      const { data, error } = await admin
        .from("user_groups")
        .insert({ school_id: schoolId, name, description })
        .select()
        .single();
      if (error) throw error;
      group = data;
    }

    // Update members if provided
    if (user_ids && Array.isArray(user_ids)) {
      // Delete existing
      await admin.from("user_group_members").delete().eq("group_id", group.id);
      
      // Insert new
      for (const uId of user_ids) {
        await admin.from("user_group_members").insert({
          group_id: group.id,
          user_id: uId
        });
      }
    }

    return NextResponse.json({ group });
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

    if (!id) return NextResponse.json({ error: "Group ID is required" }, { status: 400 });

    const admin = getAdmin();
    const { error } = await admin
      .from("user_groups")
      .delete()
      .eq("id", id)
      .eq("school_id", schoolId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
