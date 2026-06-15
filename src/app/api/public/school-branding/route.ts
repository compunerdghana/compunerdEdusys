import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function GET() {
  const { data } = await getAdmin()
    .from("schools")
    .select("name, logo_url")
    .limit(1)
    .maybeSingle();

  return NextResponse.json(
    { name: data?.name ?? null, logo_url: data?.logo_url ?? null },
    { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" } },
  );
}
