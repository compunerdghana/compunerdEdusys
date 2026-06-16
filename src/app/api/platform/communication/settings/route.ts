import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function GET() {
  const admin = getAdmin();
  const { data } = await admin.from("platform_comm_settings").select("channel, provider, sender_id, is_active, updated_at");
  return NextResponse.json({ settings: data ?? [] });
}

export async function POST(req: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await req.json();
    const { channel, provider, api_key, api_secret, sender_id, extra_config, is_active, updated_by } = body;

    if (!channel) return NextResponse.json({ error: "channel is required" }, { status: 400 });

    const { error } = await admin.from("platform_comm_settings").upsert({
      channel,
      provider: provider ?? null,
      api_key: api_key ?? null,
      api_secret: api_secret ?? null,
      sender_id: sender_id ?? null,
      extra_config: extra_config ?? {},
      is_active: is_active ?? false,
      updated_by: updated_by ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "channel" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("settings POST error", err);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
