import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST() {
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Create bucket if it doesn't exist
  const { error } = await adminClient.storage.createBucket("school-assets", {
    public: true,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
  });

  // Ignore "already exists" error
  if (error && !error.message.includes("already exists") && !error.message.includes("Duplicate")) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
