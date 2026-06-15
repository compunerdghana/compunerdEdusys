/**
 * GET  /api/admin/school-events?schoolId=...  → list events
 * POST /api/admin/school-events               → create event
 * DELETE /api/admin/school-events?id=...      → delete event
 *
 * Requires migration (run once in Supabase SQL editor):
 *   CREATE TABLE IF NOT EXISTS school_events (
 *     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *     school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
 *     title TEXT NOT NULL,
 *     description TEXT,
 *     event_date DATE NOT NULL,
 *     color TEXT DEFAULT '#262262',
 *     created_by UUID REFERENCES auth.users(id),
 *     created_at TIMESTAMPTZ DEFAULT NOW()
 *   );
 *   ALTER TABLE school_events ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "school_members_read_events" ON school_events FOR SELECT
 *     USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
 */
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function getUser() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const schoolId = req.nextUrl.searchParams.get("schoolId");
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  const { data, error } = await admin
    .from("school_events")
    .select("*")
    .eq("school_id", schoolId)
    .order("event_date");

  if (error) {
    const msg = error.message ?? "";
    if (
      msg.includes("does not exist") ||
      msg.includes("relation") ||
      msg.includes("Could not find") ||
      msg.includes("schema") ||
      msg.toLowerCase().includes("school_events")
    ) {
      return NextResponse.json({ events: [], tableNotReady: true });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  return NextResponse.json({ events: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { school_id, title, description, event_date, color } = body;
  if (!school_id || !title || !event_date) {
    return NextResponse.json({ error: "school_id, title, event_date required" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("school_events")
    .insert({ school_id, title, description: description ?? null, event_date, color: color ?? "#262262", created_by: user.id })
    .select("*")
    .single();

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("does not exist") || msg.includes("relation") || msg.includes("Could not find") || msg.includes("schema")) {
      return NextResponse.json({ error: "TABLE_NOT_READY" }, { status: 422 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  return NextResponse.json({ ok: true, event: data });
}

export async function DELETE(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await admin.from("school_events").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
