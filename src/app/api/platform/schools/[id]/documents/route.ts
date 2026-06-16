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
      .from("school_documents")
      .select("*")
      .eq("school_id", id)
      .order("created_at", { ascending: false });

    if (isMissing(error)) {
      return NextResponse.json({ documents: [] });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ documents: data ?? [] });
  } catch (err) {
    console.error("GET platform/schools/[id]/documents error", err);
    return NextResponse.json({ error: "Failed to load documents" }, { status: 500 });
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
    const {
      name,
      type = "other",
      file_url,
      file_size,
      uploaded_by,
      uploaded_by_name,
    } = body as {
      name: string;
      type?: string;
      file_url?: string;
      file_size?: number;
      uploaded_by?: string;
      uploaded_by_name?: string;
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("school_documents")
      .insert({
        school_id: id,
        name: name.trim(),
        type,
        file_url: file_url ?? null,
        file_size: file_size ?? null,
        uploaded_by: uploaded_by ?? null,
        uploaded_by_name: uploaded_by_name ?? null,
      })
      .select()
      .single();

    if (isMissing(error)) {
      return NextResponse.json({ error: "school_documents table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ document: data });
  } catch (err) {
    console.error("POST platform/schools/[id]/documents error", err);
    return NextResponse.json({ error: "Failed to create document record" }, { status: 500 });
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
    const docId = searchParams.get("id");

    if (!docId) {
      return NextResponse.json({ error: "?id=docId is required" }, { status: 400 });
    }

    const { error } = await admin
      .from("school_documents")
      .delete()
      .eq("id", docId)
      .eq("school_id", id);

    if (isMissing(error)) {
      return NextResponse.json({ error: "school_documents table not found" }, { status: 500 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE platform/schools/[id]/documents error", err);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
