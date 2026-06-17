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
      "school_id_sequences",
    ];

    for (const table of tableChecks) {
      const { error } = await admin.from(table).select("id").limit(1);
      if (error) {
        const msg = error.message.toLowerCase();
        // PGRST116 = no rows returned (table exists but is empty) — that's fine
        // Only flag as missing if the table genuinely doesn't exist
        if (
          error.code !== "PGRST116" &&
          (
            msg.includes("relation") ||
            msg.includes("does not exist") ||
            msg.includes("could not find") ||
            msg.includes("schema cache") ||
            error.code === "PGRST205"
          )
        ) {
          missingTables.push(table);
        }
      }
    }

    // Check if new columns exist on existing tables
    const { error: profileColErr } = await admin.from("profiles").select("gender").limit(1);
    if (profileColErr && profileColErr.message.toLowerCase().includes("column")) {
      missingTables.push("profiles (column: gender)");
    }

    const { error: studentColErr } = await admin.from("students").select("student_id").limit(1);
    if (studentColErr && studentColErr.message.toLowerCase().includes("column")) {
      missingTables.push("students (column: student_id)");
    }

    const { error: parentColErr } = await admin.from("parents").select("parent_id").limit(1);
    if (parentColErr && parentColErr.message.toLowerCase().includes("column")) {
      missingTables.push("parents (column: parent_id)");
    }

    const migrationPath = path.join(process.cwd(), "supabase", "migrations", "20260617_user_management.sql");
    let sql = "";
    if (fs.existsSync(migrationPath)) {
      sql = fs.readFileSync(migrationPath, "utf-8");
    }

    if (missingTables.length > 0) {
      return NextResponse.json({
        ok: false,
        message: `The following schema elements are missing or incomplete: ${missingTables.join(", ")}. Please copy the SQL migration code and run it in the Supabase SQL editor.`,
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
