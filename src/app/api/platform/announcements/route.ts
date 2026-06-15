import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const isMissing = (e: unknown) =>
  (e as { code?: string; message?: string })?.code === "42P01" ||
  (e as { message?: string })?.message?.includes("does not exist");

export async function GET() {
  try {
    const admin = getAdmin();

    const { data, error } = await admin
      .from("platform_announcements")
      .select("*, platform_users!platform_announcements_sent_by_fkey ( full_name )")
      .order("sent_at", { ascending: false });

    if (isMissing(error)) {
      return NextResponse.json({ announcements: [] });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ announcements: data ?? [] });
  } catch (err) {
    console.error("GET platform/announcements error", err);
    return NextResponse.json({ error: "Failed to load announcements" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await request.json();

    const {
      title,
      body: msgBody,
      type = "announcement",
      target = "all",
      target_school_ids = [],
      priority = "normal",
      sent_by,
      expires_at,
    } = body;

    if (!title || !msgBody) {
      return NextResponse.json(
        { error: "title and body are required" },
        { status: 400 },
      );
    }

    const { data, error } = await admin
      .from("platform_announcements")
      .insert({
        title,
        body: msgBody,
        type,
        target,
        target_school_ids,
        priority,
        sent_by: sent_by ?? null,
        expires_at: expires_at ?? null,
      })
      .select()
      .single();

    if (isMissing(error)) {
      return NextResponse.json({ error: "platform_announcements table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ announcement: data });
  } catch (err) {
    console.error("POST platform/announcements error", err);
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });
  }
}
