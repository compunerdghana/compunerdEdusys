import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { schoolId, payload } = body as { schoolId: string | null; payload: Record<string, unknown> };

    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (schoolId) {
      const { error } = await getAdmin().from("schools").update(payload).eq("id", schoolId);
      if (error) {
        const isSchemaErr = /column|schema|Could not find/i.test(error.message);
        if (isSchemaErr) {
          // Some columns may not exist yet — retry with guaranteed-safe subset
          const SAFE = new Set(["name","motto","address","phone","email","logo_url","headmaster_signature_url","currency"]);
          const safe = Object.fromEntries(Object.entries(payload).filter(([k]) => SAFE.has(k)));
          const { error: e2 } = await getAdmin().from("schools").update(safe).eq("id", schoolId);
          if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
        } else {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }
      return NextResponse.json({ ok: true });
    } else {
      const name = (payload.name as string) || "school";
      const resolvedSchoolCode =
        (payload.code as string) ||
        (payload.school_code as string) ||
        (name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Math.floor(1000 + Math.random() * 9000));

      const { data, error } = await getAdmin()
        .from("schools")
        .insert({
          ...payload,
          code: resolvedSchoolCode,
          school_code: resolvedSchoolCode,
          created_by: user.id
        })
        .select("id")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await getAdmin().from("profiles").update({ school_id: data.id }).eq("id", user.id);
      return NextResponse.json({ ok: true, schoolId: data.id });
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
