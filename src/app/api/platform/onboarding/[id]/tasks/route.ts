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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const admin = getAdmin();

    const { data, error } = await admin
      .from("onboarding_tasks")
      .select("*")
      .eq("onboarding_id", id)
      .order("created_at", { ascending: true });

    if (isMissing(error)) {
      return NextResponse.json({ tasks: [] });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tasks: data ?? [] });
  } catch (err) {
    console.error("GET platform/onboarding/[id]/tasks error", err);
    return NextResponse.json({ error: "Failed to load tasks" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const admin = getAdmin();
    const body = await request.json();
    const { title, description, category, assigned_to, assigned_to_name, priority, due_date } = body;

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    // Get school_id from onboarding record
    const { data: onboarding, error: fetchError } = await admin
      .from("school_onboarding")
      .select("school_id")
      .eq("id", id)
      .single();

    if (isMissing(fetchError) || fetchError) {
      return NextResponse.json({ error: "Onboarding not found" }, { status: 404 });
    }

    const { data, error } = await admin
      .from("onboarding_tasks")
      .insert({
        school_id: onboarding.school_id,
        onboarding_id: id,
        title,
        description: description ?? null,
        category: category ?? "general",
        assigned_to: assigned_to ?? null,
        assigned_to_name: assigned_to_name ?? null,
        priority: priority ?? "medium",
        due_date: due_date ?? null,
        status: "pending",
      })
      .select()
      .single();

    if (isMissing(error)) {
      return NextResponse.json({ error: "Tasks table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ task: data }, { status: 201 });
  } catch (err) {
    console.error("POST platform/onboarding/[id]/tasks error", err);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json({ error: "taskId query param is required" }, { status: 400 });
    }

    const admin = getAdmin();
    const body = await request.json();

    const allowedFields = [
      "title", "description", "category", "assigned_to", "assigned_to_name",
      "priority", "due_date", "status",
    ];
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (body.status === "completed" && !updates.completed_at) {
      updates.completed_at = new Date().toISOString();
    }

    const { data, error } = await admin
      .from("onboarding_tasks")
      .update(updates)
      .eq("id", taskId)
      .eq("onboarding_id", id)
      .select()
      .single();

    if (isMissing(error)) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ task: data });
  } catch (err) {
    console.error("PATCH platform/onboarding/[id]/tasks error", err);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json({ error: "taskId query param is required" }, { status: 400 });
    }

    const admin = getAdmin();

    const { error } = await admin
      .from("onboarding_tasks")
      .delete()
      .eq("id", taskId)
      .eq("onboarding_id", id);

    if (isMissing(error)) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE platform/onboarding/[id]/tasks error", err);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
