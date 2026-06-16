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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = getAdmin();
    const { id } = await params;

    const { data, error } = await admin
      .from("school_notes")
      .select("*")
      .eq("school_id", id)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (isMissing(error)) {
      return NextResponse.json({ notes: [] });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notes: data ?? [] });
  } catch (err) {
    console.error("GET platform/schools/[id]/notes error", err);
    return NextResponse.json({ error: "Failed to load notes" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = getAdmin();
    const { id } = await params;
    const body = await request.json();
    const { note, is_pinned = false, author_id, author_name } = body as {
      note: string;
      is_pinned?: boolean;
      author_id?: string;
      author_name?: string;
    };

    if (!note?.trim()) {
      return NextResponse.json({ error: "note is required" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("school_notes")
      .insert({
        school_id: id,
        note: note.trim(),
        is_pinned,
        author_id: author_id ?? null,
        author_name: author_name ?? null,
      })
      .select()
      .single();

    if (isMissing(error)) {
      return NextResponse.json({ error: "school_notes table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ note: data });
  } catch (err) {
    console.error("POST platform/schools/[id]/notes error", err);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = getAdmin();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get("id");

    if (!noteId) {
      return NextResponse.json({ error: "?id=noteId is required" }, { status: 400 });
    }

    const { error } = await admin
      .from("school_notes")
      .delete()
      .eq("id", noteId)
      .eq("school_id", id);

    if (isMissing(error)) {
      return NextResponse.json({ error: "school_notes table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE platform/schools/[id]/notes error", err);
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
  }
}
