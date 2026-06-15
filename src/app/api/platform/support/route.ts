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

async function generateTicketNumber(admin: ReturnType<typeof getAdmin>): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await admin
    .from("support_tickets")
    .select("id", { count: "exact", head: true });
  const seq = String((count ?? 0) + 1).padStart(4, "0");
  return `TKT-${year}-${seq}`;
}

export async function GET(request: NextRequest) {
  try {
    const admin = getAdmin();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const schoolId = searchParams.get("schoolId");

    let query = admin
      .from("support_tickets")
      .select(
        `*, schools ( name ),
         platform_users!support_tickets_assigned_to_fkey ( full_name )`,
      )
      .order("created_at", { ascending: false });

    if (status !== "all") {
      if (status === "open") {
        query = query.in("status", ["open", "assigned", "in_progress"]);
      } else if (status === "resolved") {
        query = query.in("status", ["resolved", "closed"]);
      } else {
        query = query.eq("status", status);
      }
    }

    if (schoolId) {
      query = query.eq("school_id", schoolId);
    }

    const { data, error } = await query;
    if (isMissing(error)) {
      return NextResponse.json({ tickets: [] });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tickets: data ?? [] });
  } catch (err) {
    console.error("GET platform/support error", err);
    return NextResponse.json({ error: "Failed to load tickets" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await request.json();

    const {
      school_id,
      submitted_by_name,
      submitted_by_email,
      submitted_by_profile,
      subject,
      description,
      type = "support",
      priority = "normal",
    } = body;

    if (!subject || !description) {
      return NextResponse.json(
        { error: "subject and description are required" },
        { status: 400 },
      );
    }

    const ticketNumber = await generateTicketNumber(admin);

    const { data, error } = await admin
      .from("support_tickets")
      .insert({
        ticket_number: ticketNumber,
        school_id: school_id ?? null,
        submitted_by_name: submitted_by_name ?? null,
        submitted_by_email: submitted_by_email ?? null,
        submitted_by_profile: submitted_by_profile ?? null,
        subject,
        description,
        type,
        priority,
        status: "open",
      })
      .select()
      .single();

    if (isMissing(error)) {
      return NextResponse.json({ error: "support_tickets table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ticket: data });
  } catch (err) {
    console.error("POST platform/support error", err);
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Auto-set resolved_at when resolving or closing
    if (
      updates.status === "resolved" ||
      updates.status === "closed"
    ) {
      updates.resolved_at = updates.resolved_at ?? new Date().toISOString();
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await admin
      .from("support_tickets")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ticket: data });
  } catch (err) {
    console.error("PATCH platform/support error", err);
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}
