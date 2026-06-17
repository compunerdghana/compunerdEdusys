import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function GET() {
  try {
    const migrationPath = path.join(process.cwd(), "supabase", "migrations", "20260617_user_management.sql");
    let sql = "";
    if (fs.existsSync(migrationPath)) {
      sql = fs.readFileSync(migrationPath, "utf-8");
    } else {
      sql = "-- Migration file not found on server disk.";
    }

    return new Response(sql, {
      headers: { "Content-Type": "text/plain" },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST() {
  try {
    const admin = getAdmin();
    const errors: string[] = [];
    const missingTables: string[] = [];

    const tableChecks = [
      "parent_student_links",
      "teachers",
      "staff",
      "user_permissions",
      "login_history",
      "user_groups",
      "user_group_members",
      "user_documents",
      "school_id_sequences"
    ];

    for (const table of tableChecks) {
      const { error } = await admin.from(table).select("id").limit(1);
      if (error && (error.message.includes("relation") || error.message.includes("does not exist"))) {
        missingTables.push(table);
      }
    }

    const migrationPath = path.join(process.cwd(), "supabase", "migrations", "20260617_user_management.sql");
    let sql = "";
    if (fs.existsSync(migrationPath)) {
      sql = fs.readFileSync(migrationPath, "utf-8");
    }

    if (missingTables.length > 0) {
      return NextResponse.json({
        ok: false,
        message: `The following tables are missing from the schema: ${missingTables.join(", ")}. Please copy the SQL migration code and run it in the Supabase SQL editor.`,
        missingTables,
        sql
      }, { status: 200 });
    }

    return NextResponse.json({
      ok: true,
      message: "Database tables verified successfully. All required User Management schema tables are present."
    });
  } catch (err) {
    console.error("Setup DB check error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
